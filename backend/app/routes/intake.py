import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from app.db.supabase_client import supabase, require_role, UserContext
from app.models.intake import (
    IntakeReportCreate,
    IntakeReportResponse,
    IntakeReportUpdate,
    IntakeStatus,
)
from app.models.task import TaskCreate, TaskStatus
from app.services.deduplicator import find_possible_duplicate
from app.utils.audit import log_audit, AuditActions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/intake-reports", tags=["intake"])

# Dependency for NGO access
require_ngo = require_role(["ngo", "admin"])

@router.post("/", response_model=IntakeReportResponse)
async def create_intake_report(
    report: IntakeReportCreate,
    background_tasks: BackgroundTasks,
    user: UserContext = Depends(require_role(["ngo", "field_worker", "admin"]))
):
    """
    Create a new intake report and check for duplicates.
    Accessible by NGO or Field Workers.
    """
    try:
        ngo_id = user.ngo_id
        if not ngo_id:
            raise HTTPException(status_code=403, detail="NGO context missing")

        data = report.model_dump(mode="json")
        data["ngo_id"] = ngo_id
        data["status"] = IntakeStatus.PENDING.value

        # --- Duplicate Detection Logic ---
        seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        existing_res = (
            supabase.table("intake_reports")
            .select("id, title, description, lat, lng, source, ngo_id, status")
            .eq("ngo_id", ngo_id)
            .gte("created_at", seven_days_ago)
            .execute()
        )
        
        if existing_res.data:
            dup_id, score = find_possible_duplicate(data, existing_res.data)
            if dup_id:
                data["possible_duplicate_of"] = dup_id
                data["duplicate_score"] = score
        # ---------------------------------

        response = supabase.table("intake_reports").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create intake report")
            
        new_report = response.data[0]
        
        # Audit Log
        background_tasks.add_task(
            log_audit,
            action_type=AuditActions.REPORT_CREATED,
            entity_type="report",
            entity_id=new_report["id"],
            description=f"New intake report created: {new_report['title']} via {new_report['source']} by {user.user_id}",
            ngo_id=ngo_id,
            user_id=user.user_id,
            user_role=user.role
        )
        
        if new_report.get("possible_duplicate_of"):
            background_tasks.add_task(
                log_audit,
                action_type=AuditActions.DUPLICATE_FLAGGED,
                entity_type="report",
                entity_id=new_report["id"],
                description=f"Report flagged as potential duplicate of {new_report['possible_duplicate_of']} (Score: {new_report['duplicate_score']})",
                ngo_id=ngo_id
            )

        return new_report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating intake report: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[IntakeReportResponse])
async def list_intake_reports(
    status: Optional[IntakeStatus] = Query(None),
    urgency: Optional[str] = Query(None),
    user: UserContext = Depends(require_ngo)
):
    """
    List intake reports for the current NGO. Only NGO accessible.
    """
    try:
        ngo_id = user.ngo_id
        query = supabase.table("intake_reports").select("*").eq("ngo_id", ngo_id)
        
        if status:
            query = query.eq("status", status.value)
        if urgency:
            query = query.eq("urgency", urgency)
            
        query = query.order("created_at", desc=True)
        
        response = query.execute()
        return response.data
    except Exception as e:
        logger.error(f"Error listing intake reports: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{id}/duplicates", response_model=List[IntakeReportResponse])
async def get_report_duplicates(
    id: UUID,
    user: UserContext = Depends(require_ngo)
):
    """
    Get all potential duplicates for a specific report. Only NGO accessible.
    """
    try:
        # Check if this report itself is marked as a duplicate
        report_res = supabase.table("intake_reports").select("possible_duplicate_of").eq("id", str(id)).eq("ngo_id", user.ngo_id).execute()
        if not report_res.data or len(report_res.data) == 0:
            raise HTTPException(status_code=404, detail="Report not found in your NGO")
        
        report_data = report_res.data[0]
        ids_to_fetch = []
        if report_data.get("possible_duplicate_of"):
            ids_to_fetch.append(report_data["possible_duplicate_of"])
            
        # Also find any reports that point to THIS report as a duplicate
        others_res = supabase.table("intake_reports").select("id").eq("possible_duplicate_of", str(id)).execute()
        if others_res.data:
            ids_to_fetch.extend([r["id"] for r in others_res.data])
            
        if not ids_to_fetch:
            return []
            
        results = supabase.table("intake_reports").select("*").in_("id", ids_to_fetch).execute()
        return results.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching duplicates: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{id}/review", response_model=IntakeReportResponse)
async def review_intake_report(
    id: UUID,
    update: IntakeReportUpdate,
    background_tasks: BackgroundTasks,
    user: UserContext = Depends(require_ngo)
):
    """
    Mark a report as reviewed, approved, or rejected. Only NGO accessible.
    """
    try:
        ngo_id = user.ngo_id
        # Check ownership
        check = supabase.table("intake_reports").select("id, status").eq("id", str(id)).eq("ngo_id", ngo_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Intake report not found")

        old_status = check.data[0]["status"]
        data = update.model_dump(mode="json", exclude_none=True)
        data["reviewed_at"] = datetime.now(timezone.utc).isoformat()
        
        response = supabase.table("intake_reports").update(data).eq("id", str(id)).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to update intake report")
            
        updated_report = response.data[0]
        new_status = updated_report["status"]

        # Audit Log
        action = AuditActions.REPORT_REVIEWED
        if new_status == IntakeStatus.APPROVED.value:
            action = AuditActions.REPORT_APPROVED
        elif new_status == IntakeStatus.REJECTED.value:
            action = AuditActions.REPORT_REJECTED

        background_tasks.add_task(
            log_audit,
            action_type=action,
            entity_type="report",
            entity_id=str(id),
            description=f"Intake report status changed from {old_status} to {new_status} by {user.user_id}",
            ngo_id=ngo_id,
            user_id=user.user_id,
            user_role=user.role
        )
            
        return updated_report
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reviewing intake report: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{id}/convert-to-task", response_model=dict)
async def convert_to_task(
    id: UUID,
    task_data: TaskCreate,
    background_tasks: BackgroundTasks,
    user: UserContext = Depends(require_ngo)
):
    """
    Convert an approved intake report into an actionable task. Only NGO accessible.
    """
    try:
        ngo_id = user.ngo_id
        # 1. Fetch report and verify status
        report_res = supabase.table("intake_reports").select("*").eq("id", str(id)).eq("ngo_id", ngo_id).execute()
        if not report_res.data or len(report_res.data) == 0:
            raise HTTPException(status_code=404, detail="Intake report not found")
            
        report = report_res.data[0]
        if report["status"] != IntakeStatus.APPROVED.value:
            raise HTTPException(status_code=400, detail="Only approved reports can be converted to tasks")
        
        if report["converted_to_task_id"]:
            raise HTTPException(status_code=400, detail="Report already converted to task")

        # 2. Create the task
        task_payload = task_data.model_dump(mode="json")
        task_payload["ngo_id"] = ngo_id
        task_payload["status"] = TaskStatus.OPEN.value
        task_payload["source"] = f"intake_{report['source']}"
        
        if report.get("image_url"):
            task_payload["source_image_url"] = report["image_url"]

        task_res = supabase.table("tasks").insert(task_payload).execute()
        if not task_res.data:
            raise HTTPException(status_code=500, detail="Failed to create task from report")
            
        task_id = task_res.data[0]["id"]

        # 3. Update report with task ID
        supabase.table("intake_reports").update({"converted_to_task_id": task_id}).eq("id", str(id)).execute()

        # Audit Log
        background_tasks.add_task(
            log_audit,
            action_type=AuditActions.TASK_CREATED,
            entity_type="task",
            entity_id=task_id,
            description=f"Task created from intake report by {user.user_id}",
            ngo_id=ngo_id,
            user_id=user.user_id,
            user_role=user.role
        )

        return {
            "status": "success",
            "task_id": task_id,
            "message": "Intake report successfully converted to task"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error converting to task: {e}")
        raise HTTPException(status_code=500, detail=str(e))
