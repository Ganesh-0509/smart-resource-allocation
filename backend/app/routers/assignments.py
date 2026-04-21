import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db.supabase_client import supabase
from app.models.task import TaskStatus

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

_ASSIGNMENT_SELECTS = [
    "id, task_id, volunteer_id, assigned_by, assigned_at, completed_at, outcome, status, sla_deadline, sla_hours, sla_breached, check_in_time, check_out_time, check_in_lat, check_in_lng, check_out_lat, check_out_lng, escalated_to, escalation_reason, notes, tasks(*), volunteers(id, name, phone, skills, availability, performance_score, total_tasks_done, lat, lng, created_at)",
    "id, task_id, volunteer_id, assigned_by, assigned_at, completed_at, outcome, status, sla_deadline, sla_hours, sla_breached, check_in_time, check_out_time, check_in_lat, check_in_lng, check_out_lat, check_out_lng, escalated_to, escalation_reason, notes, tasks(*)",
    "id, task_id, volunteer_id, assigned_by, assigned_at, completed_at, outcome, status, sla_deadline, sla_hours, sla_breached, check_in_time, check_out_time, check_in_lat, check_in_lng, check_out_lat, check_out_lng, escalated_to, escalation_reason, notes, *",
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
):
    """List assignments with optional volunteer/task/status filters."""
    try:
        rows = _fetch_assignments(
            volunteer_id=str(volunteer_id) if volunteer_id else None,
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
async def get_assignment(assignment_id: UUID):
    """Get a single assignment by ID, including related task/volunteer when available."""
    try:
        rows = _fetch_assignments(assignment_id=str(assignment_id), limit=1)
        if not rows:
            raise HTTPException(status_code=404, detail="Assignment not found")
        return rows[0]
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error fetching assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/accept")
async def accept_assignment(assignment_id: UUID):
    """Accept an assignment."""
    try:
        response = supabase.table("assignments").update({"status": "accepted"}).eq("id", str(assignment_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        assignment = response.data[0]
        _log_activity("assignment_accepted", None, assignment["task_id"], f"Assignment {assignment_id} accepted")
        return {"message": "Assignment accepted"}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error accepting assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/decline")
async def decline_assignment(assignment_id: UUID, request: AssignmentDeclineRequest):
    """Decline an assignment with a reason."""
    try:
        response = supabase.table("assignments").update({
            "status": "declined",
            "notes": request.reason
        }).eq("id", str(assignment_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        assignment = response.data[0]
        _log_activity("assignment_declined", None, assignment["task_id"], f"Assignment {assignment_id} declined: {request.reason}")
        return {"message": "Assignment declined", "assignment_id": assignment_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error declining assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/reassign")
async def reassign_assignment(assignment_id: UUID, request: AssignmentReassignRequest):
    """Reassign an assignment to a new volunteer."""
    try:
        response = supabase.table("assignments").update({
            "volunteer_id": str(request.new_volunteer_id),
            "status": "reassigned",
            "notes": request.reason or ""
        }).eq("id", str(assignment_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        assignment = response.data[0]
        reason = request.reason or "No reason provided"
        _log_activity("assignment_reassigned", None, assignment["task_id"], f"Assignment {assignment_id} reassigned to volunteer {request.new_volunteer_id}: {reason}")
        return {"message": "Assignment reassigned", "assignment_id": assignment_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error reassigning assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/escalate")
async def escalate_assignment(assignment_id: UUID, request: AssignmentEscalateRequest):
    """Escalate an assignment to a senior volunteer."""
    try:
        response = supabase.table("assignments").update({
            "escalated_to": str(request.escalated_to),
            "status": "escalated",
            "escalation_reason": request.reason
        }).eq("id", str(assignment_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        assignment = response.data[0]
        _log_activity("assignment_escalated", None, assignment["task_id"], f"Assignment {assignment_id} escalated to {request.escalated_to}: {request.reason}")
        return {"message": "Assignment escalated", "assignment_id": assignment_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error escalating assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/check_in")
async def check_in_assignment(assignment_id: UUID, request: AssignmentCheckInRequest):
    """Check in to an assignment with location."""
    try:
        response = supabase.table("assignments").update({
            "check_in_time": "now()",
            "check_in_lat": request.lat,
            "check_in_lng": request.lng,
            "notes": request.notes or ""
        }).eq("id", str(assignment_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        assignment = response.data[0]
        _log_activity("assignment_check_in", None, assignment["task_id"], f"Assignment {assignment_id} checked in at {request.lat}, {request.lng}")
        return {"message": "Checked in", "assignment_id": assignment_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error checking in assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.put("/{assignment_id}/check_out")
async def check_out_assignment(assignment_id: UUID, request: AssignmentCheckOutRequest):
    """Check out from an assignment and mark as completed."""
    try:
        response = supabase.table("assignments").update({
            "check_out_time": "now()",
            "check_out_lat": request.lat,
            "check_out_lng": request.lng,
            "status": "completed",
            "completed_at": "now()",
            "outcome": request.outcome or "Completed",
            "notes": request.notes or ""
        }).eq("id", str(assignment_id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        assignment = response.data[0]
        _log_activity("assignment_check_out", None, assignment["task_id"], f"Assignment {assignment_id} checked out at {request.lat}, {request.lng}")
        return {"message": "Checked out and completed", "assignment_id": assignment_id}
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error checking out assignment %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.get("/sla/breached")
async def get_breached_assignments(
    volunteer_id: Optional[UUID] = Query(None, description="Filter by volunteer ID"),
    task_id: Optional[UUID] = Query(None, description="Filter by task ID"),
    limit: int = Query(100, ge=1, le=500),
):
    """Get assignments with SLA breaches."""
    try:
        query = supabase.table("assignments").select(
            "id, task_id, volunteer_id, assigned_by, assigned_at, sla_deadline, sla_breached, status, tasks(*), volunteers(id, name, phone)"
        ).eq("sla_breached", True).order("sla_deadline", desc=True).limit(limit)

        if volunteer_id:
            query = query.eq("volunteer_id", str(volunteer_id))
        if task_id:
            query = query.eq("task_id", str(task_id))

        response = query.execute()
        return response.data or []
    except Exception as exc:
        logger.error("Error fetching breached assignments: %s", exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.get("/timeline/dashboard")
async def get_assignment_timeline(
    status: Optional[str] = Query(None, description="Filter by assignment status"),
    volunteer_id: Optional[UUID] = Query(None, description="Filter by volunteer ID"),
    days: int = Query(7, ge=1, le=90, description="Days of history to show"),
):
    """Get a timeline view of all assignments with state, SLA, and completion data."""
    try:
        query = supabase.table("assignments").select(
            "id, task_id, volunteer_id, assigned_at, sla_deadline, check_in_time, check_out_time, completed_at, status, sla_breached, sla_hours, tasks(title, need_type, district, urgency_score), volunteers(id, name)"
        ).gte("assigned_at", f"now() - interval '{days} days'").order("assigned_at", desc=True)

        if status:
            query = query.eq("status", status)
        if volunteer_id:
            query = query.eq("volunteer_id", str(volunteer_id))

        response = query.execute()
        return response.data or []
    except Exception as exc:
        logger.error("Error fetching assignment timeline: %s", exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")


@router.get("/{assignment_id}/history")
async def get_assignment_history(assignment_id: UUID):
    """Get the state transition history for an assignment."""
    try:
        response = supabase.table("assignment_history").select("*").eq("assignment_id", str(assignment_id)).order("changed_at", desc=True).execute()
        return response.data or []
    except Exception as exc:
        logger.error("Error fetching assignment history for %s: %s", assignment_id, exc)
        raise HTTPException(status_code=400, detail=f"Database error: {exc}")
