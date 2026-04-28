import logging
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from pydantic import BaseModel

from app.db.supabase_client import supabase, require_role, UserContext
from app.models.task import TaskStatus
from app.utils.audit import log_audit, AuditActions

logger = logging.getLogger(__name__)

# ===== Pydantic Models =====

class AssignmentDeclineRequest(BaseModel):
    reason: str

class AssignmentReassignRequest(BaseModel):
    new_volunteer_id: UUID
    reason: Optional[str] = None

class AssignmentEscalateRequest(BaseModel):
    escalated_to: UUID
    reason: str

class AssignmentCheckInRequest(BaseModel):
    lat: float
    lng: float
    notes: Optional[str] = None

class AssignmentCheckOutRequest(BaseModel):
    lat: float
    lng: float
    outcome: Optional[str] = None
    notes: Optional[str] = None

router = APIRouter(prefix="/api/assignments", tags=["assignments"])

# Dependencies
require_ngo = require_role(["ngo", "admin"])
require_volunteer = require_role(["volunteer", "field_worker"])
require_any = require_role(["ngo", "volunteer", "field_worker", "admin"])

_ASSIGNMENT_SELECTS = [
    "id, task_id, volunteer_id, assigned_by, assigned_at, accepted_at, completed_at, failed_at, outcome, status, sla_deadline, sla_hours, sla_breached, check_in_time, check_out_time, check_in_lat, check_in_lng, check_out_lat, check_out_lng, escalated_to, escalation_reason, notes, tasks(*), volunteers(id, name, phone, skills, availability, performance_score, total_tasks_done, lat, lng, created_at)",
    "id, task_id, volunteer_id, assigned_by, assigned_at, accepted_at, completed_at, failed_at, outcome, status, sla_deadline, sla_hours, sla_breached, check_in_time, check_out_time, check_in_lat, check_in_lng, check_out_lat, check_out_lng, escalated_to, escalation_reason, notes, tasks(*)",
    "id, task_id, volunteer_id, assigned_by, assigned_at, accepted_at, completed_at, failed_at, outcome, status, sla_deadline, sla_hours, sla_breached, check_in_time, check_out_time, check_in_lat, check_in_lng, check_out_lat, check_out_lng, escalated_to, escalation_reason, notes, *",
]


def _log_activity(action_type: str, actor_id: Optional[str], task_id: Optional[str], details: str):
    """Log an activity to the activity_log table."""
    try:
        supabase.table("activity_log").insert({
            "action_type": action_type,
            "actor_id": actor_id,
            "task_id": task_id,
            "details": details,
        }).execute()
    except Exception as exc:
        logger.error("Failed to log activity: %s", exc)


def _extract_task_status(row: dict) -> Optional[str]:
    relation = row.get("tasks")
    if isinstance(relation, dict):
        status = relation.get("status")
        return str(status) if isinstance(status, str) else None

    if isinstance(relation, list) and relation:
        first = relation[0]
        if isinstance(first, dict):
            status = first.get("status")
            return str(status) if isinstance(status, str) else None

    return None


def _fetch_assignments(
    *,
    assignment_id: Optional[str] = None,
    volunteer_id: Optional[str] = None,
    ngo_id: Optional[str] = None,
    task_id: Optional[str] = None,
    active_only: bool = False,
    limit: int = 100,
) -> list[dict]:
    last_error: Optional[Exception] = None

    for select_clause in _ASSIGNMENT_SELECTS:
        try:
            query = (
                supabase.table("assignments")
                .select(select_clause)
                .order("assigned_at", desc=True)
                .limit(limit)
            )

            if assignment_id:
                query = query.eq("id", assignment_id)
            if volunteer_id:
                query = query.eq("volunteer_id", volunteer_id)
            if ngo_id:
                query = query.eq("ngo_id", ngo_id)
            if task_id:
                query = query.eq("task_id", task_id)
            if active_only:
                query = query.is_("completed_at", "null")

            response = query.execute()
            return response.data or []
        except Exception as exc:
            last_error = exc

    if last_error:
        raise last_error

    return []


@router.get("/")
async def list_assignments(
    volunteer_id: Optional[UUID] = Query(None, description="Filter by volunteer ID"),
    task_id: Optional[UUID] = Query(None, description="Filter by task ID"),
    status: Optional[TaskStatus] = Query(None, description="Filter by linked task status"),
    assignment_status: Optional[str] = Query(None, description="Filter by assignment status"),
    active_only: bool = Query(False, description="Only assignments without completed_at"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    user: UserContext = Depends(require_any)
):
    """List assignments. Filtered by user role and NGO context."""
    try:
        # Security: ensure users only see their own assignments or their NGO's
        target_volunteer_id = None
        target_ngo_id = None

        if user.role == "volunteer":
            target_volunteer_id = user.user_id
        else:
            target_ngo_id = user.ngo_id
            if volunteer_id:
                target_volunteer_id = str(volunteer_id)

        rows = _fetch_assignments(
            volunteer_id=target_volunteer_id,
            ngo_id=target_ngo_id,
            task_id=str(task_id) if task_id else None,
            active_only=active_only,
            limit=limit,
        )

        if status:
            rows = [
                row
                for row in rows
                if _extract_task_status(row) == status.value
            ]

        if assignment_status:
            rows = [row for row in rows if row.get("status") == assignment_status]

        return rows
    except Exception as exc:
        logger.error("Error listing assignments: %s", exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.get("/{assignment_id}")
async def get_assignment(assignment_id: UUID, user: UserContext = Depends(require_any)):
    """Get a single assignment. Secure access check included."""
    try:
        rows = _fetch_assignments(assignment_id=str(assignment_id), limit=1)
        if not rows:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        assignment = rows[0]
        # Security check
        if user.role == "volunteer" and assignment["volunteer_id"] != user.user_id:
             raise HTTPException(status_code=403, detail="Forbidden: You cannot access this assignment")
        if user.role == "ngo" and assignment["ngo_id"] != user.ngo_id:
             raise HTTPException(status_code=403, detail="Forbidden: Assignment belongs to another NGO")

        return assignment
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error fetching assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/accept")
async def accept_assignment(assignment_id: UUID, background_tasks: BackgroundTasks, user: UserContext = Depends(require_volunteer)):
    """Accept an assignment. Only for assigned volunteer."""
    try:
        # Check if user is the assigned volunteer
        check = supabase.table("assignments").select("volunteer_id, task_id, ngo_id").eq("id", str(assignment_id)).execute()
        if not check.data or len(check.data) == 0:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        assignment_data = check.data[0]
        if assignment_data["volunteer_id"] != user.user_id:
             raise HTTPException(status_code=403, detail="Forbidden: This is not your assignment")

        now = datetime.now(timezone.utc).isoformat()
        response = (
            supabase.table("assignments")
            .update({"status": "accepted", "accepted_at": now})
            .eq("id", str(assignment_id))
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found during update")
            
        assignment = response.data[0]
        
        # Fetch task title and volunteer name for better log
        task_res = supabase.table("tasks").select("title, ngo_id").eq("id", assignment["task_id"]).execute()
        vol_res = supabase.table("volunteers").select("name").eq("id", assignment["volunteer_id"]).execute()
        
        task_title = task_res.data[0]["title"] if task_res.data and len(task_res.data) > 0 else "Task"
        ngo_id = task_res.data[0]["ngo_id"] if task_res.data and len(task_res.data) > 0 else None
        vol_name = vol_res.data[0]["name"] if vol_res.data and len(vol_res.data) > 0 else "Volunteer"

        _log_activity("assignment_accepted", user.user_id, assignment["task_id"], f"Assignment {assignment_id} accepted")
        
        # Audit Log
        background_tasks.add_task(
            log_audit,
            action_type=AuditActions.TASK_ACCEPTED,
            entity_type="assignment",
            entity_id=str(assignment_id),
            description=f"Volunteer {vol_name} accepted task: {task_title}",
            ngo_id=ngo_id,
            user_id=assignment["volunteer_id"],
            user_role="volunteer"
        )
        
        return {"message": "Assignment accepted"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error accepting assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/decline")
async def decline_assignment(assignment_id: UUID, request: AssignmentDeclineRequest, user: UserContext = Depends(require_volunteer)):
    """Decline an assignment. Only for assigned volunteer."""
    try:
        # Check if user is the assigned volunteer
        check = supabase.table("assignments").select("volunteer_id, task_id").eq("id", str(assignment_id)).execute()
        if not check.data or len(check.data) == 0:
            raise HTTPException(status_code=404, detail="Assignment not found")
        if check.data[0]["volunteer_id"] != user.user_id:
             raise HTTPException(status_code=403, detail="Forbidden: This is not your assignment")

        response = supabase.table("assignments").update({
            "status": "declined",
            "notes": request.reason
        }).eq("id", str(assignment_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        assignment = response.data[0]
        _log_activity("assignment_declined", user.user_id, assignment["task_id"], f"Assignment {assignment_id} declined: {request.reason}")
        return {"message": "Assignment declined", "assignment_id": assignment_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error declining assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/reassign")
async def reassign_assignment(assignment_id: UUID, request: AssignmentReassignRequest, background_tasks: BackgroundTasks, user: UserContext = Depends(require_ngo)):
    """Reassign an assignment to a new volunteer. Restricted to NGO."""
    try:
        # Check NGO ownership
        check = supabase.table("assignments").select("ngo_id, task_id").eq("id", str(assignment_id)).execute()
        if not check.data or len(check.data) == 0 or check.data[0]["ngo_id"] != user.ngo_id:
             raise HTTPException(status_code=403, detail="Forbidden: Assignment not in your NGO")

        response = supabase.table("assignments").update({
            "volunteer_id": str(request.new_volunteer_id),
            "status": "reassigned",
            "notes": request.reason or ""
        }).eq("id", str(assignment_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        assignment = response.data[0]
        reason = request.reason or "No reason provided"
        
        _log_activity("assignment_reassigned", user.user_id, assignment["task_id"], f"Assignment {assignment_id} reassigned by NGO {user.user_id}")
        
        # Audit Log
        task_res = supabase.table("tasks").select("title").eq("id", assignment["task_id"]).execute()
        background_tasks.add_task(
            log_audit,
            action_type=AuditActions.TASK_REASSIGNED,
            entity_type="assignment",
            entity_id=str(assignment_id),
            description=f"Task '{task_res.data[0]['title'] if (task_res.data and len(task_res.data) > 0) else assignment['task_id']}' reassigned by NGO. Reason: {reason}",
            ngo_id=user.ngo_id,
            user_id=user.user_id,
            user_role=user.role
        )

        return {"message": "Assignment reassigned", "assignment_id": assignment_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error reassigning assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/escalate")
async def escalate_assignment(assignment_id: UUID, request: AssignmentEscalateRequest, background_tasks: BackgroundTasks, user: UserContext = Depends(require_ngo)):
    """Escalate an assignment. Restricted to NGO."""
    try:
        # Check NGO ownership
        check = supabase.table("assignments").select("ngo_id, task_id").eq("id", str(assignment_id)).execute()
        if not check.data or len(check.data) == 0 or check.data[0]["ngo_id"] != user.ngo_id:
             raise HTTPException(status_code=403, detail="Forbidden: Assignment not in your NGO")

        response = supabase.table("assignments").update({
            "escalated_to": str(request.escalated_to),
            "status": "escalated",
            "escalation_reason": request.reason
        }).eq("id", str(assignment_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        assignment = response.data[0]
        
        # Also update task status to ESCALATED
        supabase.table("tasks").update({"status": TaskStatus.ESCALATED.value}).eq("id", assignment["task_id"]).execute()
        
        _log_activity("assignment_escalated", user.user_id, assignment["task_id"], f"Assignment {assignment_id} escalated by NGO {user.user_id}")
        
        # Audit Log
        task_res = supabase.table("tasks").select("title").eq("id", assignment["task_id"]).execute()
        background_tasks.add_task(
            log_audit,
            action_type=AuditActions.ESCALATION_TRIGGERED,
            entity_type="assignment",
            entity_id=str(assignment_id),
            description=f"Manual escalation triggered by NGO. Reason: {request.reason}",
            ngo_id=user.ngo_id,
            user_id=user.user_id,
            user_role=user.role
        )

        return {"message": "Assignment escalated", "assignment_id": assignment_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error escalating assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/check_in")
async def check_in_assignment(assignment_id: UUID, request: AssignmentCheckInRequest, user: UserContext = Depends(require_volunteer)):
    """Check in to an assignment. Only for assigned volunteer."""
    try:
        # Check ownership
        check = supabase.table("assignments").select("volunteer_id, task_id").eq("id", str(assignment_id)).execute()
        if not check.data or len(check.data) == 0 or check.data[0]["volunteer_id"] != user.user_id:
             raise HTTPException(status_code=403, detail="Forbidden: You can only check-in to your own assignments")

        response = supabase.table("assignments").update({
            "check_in_time": "now()",
            "check_in_lat": request.lat,
            "check_in_lng": request.lng,
            "status": "in_progress",
            "notes": request.notes or ""
        }).eq("id", str(assignment_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        assignment = response.data[0]
        _log_activity("assignment_check_in", user.user_id, assignment["task_id"], f"Volunteer checked in at {request.lat}, {request.lng}")
        return {"message": "Checked in", "assignment_id": assignment_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error checking in assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/check_out")
async def check_out_assignment(assignment_id: UUID, request: AssignmentCheckOutRequest, background_tasks: BackgroundTasks, user: UserContext = Depends(require_volunteer)):
    """Check out and complete assignment. Only for assigned volunteer."""
    try:
        # Check ownership
        check = supabase.table("assignments").select("volunteer_id, task_id, ngo_id").eq("id", str(assignment_id)).execute()
        if not check.data or len(check.data) == 0 or check.data[0]["volunteer_id"] != user.user_id:
             raise HTTPException(status_code=403, detail="Forbidden: You can only check-out from your own assignments")

        now = datetime.now(timezone.utc).isoformat()
        response = supabase.table("assignments").update({
            "check_out_time": "now()",
            "check_out_lat": request.lat,
            "check_out_lng": request.lng,
            "status": "completed",
            "completed_at": now,
            "outcome": request.outcome or "Completed",
            "notes": request.notes or ""
        }).eq("id", str(assignment_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        assignment = response.data[0]
        
        # Also update task status to COMPLETED
        supabase.table("tasks").update({"status": TaskStatus.COMPLETED.value}).eq("id", assignment["task_id"]).execute()
        
        _log_activity("assignment_check_out", user.user_id, assignment["task_id"], f"Volunteer checked out at {request.lat}, {request.lng}")
        
        # Audit Log
        task_res = supabase.table("tasks").select("title").eq("id", assignment["task_id"]).execute()
        vol_res = supabase.table("volunteers").select("name").eq("id", user.user_id).execute()
        background_tasks.add_task(
            log_audit,
            action_type=AuditActions.TASK_COMPLETED,
            entity_type="assignment",
            entity_id=str(assignment_id),
            description=f"Task '{task_res.data[0]['title'] if (task_res.data and len(task_res.data) > 0) else assignment['task_id']}' completed by volunteer {vol_res.data[0]['name'] if (vol_res.data and len(vol_res.data) > 0) else user.user_id}",
            ngo_id=check.data[0]["ngo_id"],
            user_id=user.user_id,
            user_role=user.role
        )

        return {"message": "Checked out and completed", "assignment_id": assignment_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error checking out assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.get("/sla/breached")
async def get_breached_assignments(
    limit: int = Query(100, ge=1, le=500),
    user: UserContext = Depends(require_ngo)
):
    """Get assignments with SLA breaches for the NGO. Restricted to NGO."""
    try:
        query = supabase.table("assignments").select(
            "id, task_id, volunteer_id, assigned_by, assigned_at, sla_deadline, sla_breached, status, tasks(*), volunteers(id, name, phone)"
        ).eq("ngo_id", user.ngo_id).eq("sla_breached", True).order("sla_deadline", desc=True).limit(limit)

        response = query.execute()
        return response.data or []
    except Exception as exc:
        logger.error("Error fetching breached assignments: %s", exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")
