import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, File, HTTPException, UploadFile, Depends
from pydantic import BaseModel

from app.db.supabase_client import supabase, get_current_ngo_id
from app.models.intake import IntakeReportCreate, IntakeSource, IntakeUrgency, IntakeStatus
from app.services.ocr_processor import process_survey
from app.services.geocoder import ensure_coordinates

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ocr", tags=["ocr"])

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
SURVEY_BUCKET = "survey-images"


def _extract_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def _upload_image_to_storage(image_bytes: bytes, extension: str, content_type: str) -> str:
    path = f"survey_uploads/{uuid4()}.{extension or 'jpg'}"
    storage = supabase.storage.from_(SURVEY_BUCKET)

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
    return path


class OCRScanResponse(BaseModel):
    title: str
    need_type: str
    urgency: str
    ward: str
    district: str
    lat: float
    lng: float
    household_count: int
    required_skills: list[str]
    description: str
    confidence_score: float
    image_url: str


@router.post("/scan", response_model=OCRScanResponse)
async def scan_survey_image(
    image: UploadFile = File(...),
    ngo_id: str = Depends(get_current_ngo_id)
):
    """
    Perform OCR on a survey image and return the extracted data.
    This does NOT save anything to intake_reports yet.
    """
    filename = image.filename or ""
    extension = _extract_extension(filename)
    content_type = (image.content_type or "").lower()

    if extension and extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid image format.")

    try:
        image_bytes = await image.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty file.")

        # 1. Process OCR
        try:
            extracted = await process_survey(image_bytes)
        except Exception as exc:
            logger.error(f"OCR failed: {exc}")
            raise HTTPException(status_code=500, detail="OCR processing failed")

        # 2. Upload to storage
        image_url = _upload_image_to_storage(image_bytes, extension, content_type or "image/jpeg")

        # 3. Map urgency score to intake urgency
        score = int(extracted.get("urgency_score", 50))
        urgency = "medium"
        if score >= 75: urgency = "high"
        elif score <= 30: urgency = "low"

        return {
            "title": extracted.get("title", ""),
            "need_type": extracted.get("need_type", "other"),
            "urgency": urgency,
            "ward": extracted.get("ward", ""),
            "district": extracted.get("district", "Madurai"),
            "lat": float(extracted.get("lat", 0.0)),
            "lng": float(extracted.get("lng", 0.0)),
            "household_count": int(extracted.get("household_count", 1)),
            "required_skills": extracted.get("required_skills", []),
            "description": extracted.get("description", ""),
            "confidence_score": float(extracted.get("confidence", 0.0)),
            "image_url": image_url
        }
    except Exception as exc:
        logger.exception("Scan failed")
        raise HTTPException(status_code=500, detail=str(exc))
