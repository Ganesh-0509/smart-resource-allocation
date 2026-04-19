import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.db.supabase_client import supabase
from app.models.task import TaskCreate, TaskResponse, TaskStatus
from app.services.ocr_processor import process_survey

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ocr", tags=["ocr"])

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
SURVEY_BUCKET = "survey-images"


def _log_activity(action: str, actor: str, task_id: str) -> None:
    details = f"actor={actor};action={action}"
    payload = {
        "action_type": action,
        "task_id": task_id,
        "details": details,
    }

    try:
        payload["actor_id"] = str(UUID(actor))
    except Exception:
        # Keep non-UUID actors in details if actor_id expects UUID.
        pass

    try:
        supabase.table("activity_log").insert(payload).execute()
    except Exception:
        fallback_payload = {
            "task_id": task_id,
            "details": details,
        }
        try:
            supabase.table("activity_log").insert(fallback_payload).execute()
        except Exception as exc:
            logger.warning("Failed to write OCR activity log: %s", exc)


class OCRUploadResponse(BaseModel):
    upload_id: UUID
    title: str
    need_type: str
    urgency_score: int
    ward: str
    household_count: int
    required_skills: list[str]
    summary: str
    confidence_score: float
    needs_review: bool


def _extract_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def _upload_image_to_storage(image_bytes: bytes, extension: str, content_type: str) -> str:
    path = f"survey_uploads/{uuid4()}.{extension or 'jpg'}"
    storage = supabase.storage.from_(SURVEY_BUCKET)

    # Support both known upload signatures in supabase-py versions.
    try:
        storage.upload(path, image_bytes, {"content-type": content_type, "upsert": "false"})
    except TypeError:
        storage.upload(path, image_bytes)

    url_result = storage.get_public_url(path)
    if isinstance(url_result, str):
        return url_result

    if isinstance(url_result, dict):
        data = url_result.get("data")
        if isinstance(data, dict):
            public_url = data.get("publicUrl") or data.get("publicURL")
            if public_url:
                return public_url
        public_url = url_result.get("publicUrl") or url_result.get("publicURL")
        if public_url:
            return public_url

    return path


@router.post("/upload", response_model=OCRUploadResponse)
async def upload_survey_image(image: UploadFile = File(...)):
    filename = image.filename or ""
    extension = _extract_extension(filename)
    content_type = (image.content_type or "").lower()

    if extension and extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid image format. Use jpg, jpeg, png, or webp.")

    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid image format. Use jpg, jpeg, png, or webp.")

    if not extension and not content_type:
        raise HTTPException(status_code=400, detail="Invalid image format. Use jpg, jpeg, png, or webp.")

    try:
        image_bytes = await image.read()

        if not image_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Image size must be 10MB or smaller.")

        extracted = await process_survey(image_bytes)

        image_url = _upload_image_to_storage(
            image_bytes=image_bytes,
            extension=extension,
            content_type=content_type or "image/jpeg",
        )

        confidence_score = float(extracted.get("confidence", 0.0))
        insert_payload = {
            "image_url": image_url,
            "raw_ocr_text": extracted.get("raw_text", ""),
            "confidence_score": confidence_score,
            "needs_review": True,
        }

        upload_response = supabase.table("survey_uploads").insert(insert_payload).execute()
        if not upload_response.data:
            raise HTTPException(status_code=500, detail="Failed to save survey upload metadata.")

        upload_id = upload_response.data[0].get("id")
        if not upload_id:
            raise HTTPException(status_code=500, detail="Survey upload created without ID.")

        required_skills = extracted.get("required_skills", [])
        if not isinstance(required_skills, list):
            required_skills = []

        return {
            "upload_id": upload_id,
            "title": extracted.get("title", "Community Need Report"),
            "need_type": extracted.get("need_type", "other"),
            "urgency_score": int(extracted.get("urgency_score", 50)),
            "ward": extracted.get("ward", ""),
            "household_count": int(extracted.get("household_count", 1)),
            "required_skills": required_skills,
            "summary": extracted.get("summary", ""),
            "confidence_score": confidence_score,
            "needs_review": True,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("OCR upload failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"OCR upload failed: {exc}")


@router.post("/confirm/{upload_id}", response_model=TaskResponse)
async def confirm_survey_upload(upload_id: UUID, confirmed_task: TaskCreate):
    try:
        upload_lookup = (
            supabase.table("survey_uploads")
            .select("id, image_url")
            .eq("id", str(upload_id))
            .limit(1)
            .execute()
        )

        if not upload_lookup.data:
            raise HTTPException(status_code=404, detail="Survey upload not found.")

        image_url = upload_lookup.data[0].get("image_url")
        task_payload = confirmed_task.model_dump(mode="json")
        task_payload["source"] = "survey"
        task_payload["status"] = TaskStatus.OPEN.value
        task_payload["source_image_url"] = image_url

        task_insert = supabase.table("tasks").insert(task_payload).execute()
        if not task_insert.data:
            raise HTTPException(status_code=500, detail="Failed to create task from survey upload.")

        created_task = task_insert.data[0]
        created_task_id = created_task.get("id")

        if not created_task_id:
            raise HTTPException(status_code=500, detail="Created task is missing ID.")

        (
            supabase.table("survey_uploads")
            .update({"extracted_task_id": created_task_id, "needs_review": False})
            .eq("id", str(upload_id))
            .execute()
        )

        _log_activity(action="Submitted", actor="survey_ocr", task_id=str(created_task_id))

        return created_task
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Survey confirmation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Survey confirmation failed: {exc}")
