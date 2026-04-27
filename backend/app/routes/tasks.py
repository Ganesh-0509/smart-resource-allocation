import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from pydantic import BaseModel

from app.db.supabase_client import supabase, require_role, UserContext
from app.models.task import NeedType, TaskAssign, TaskCreate, TaskResponse, TaskStatus
from app.services.matcher import match_volunteers
from app.services.notifier import (
    send_assignment_sms, 
    send_batch_sms, 
    send_acceptance_confirmation, 
    send_acceptance_cancellation
)
from app.services.geocoder import ensure_coordinates
from app.services.escalator import check_and_escalate_tasks, reassign_task
from app.utils.errors import handle_db_error
from app.utils.audit import log_audit, AuditActions

logger = logging.getLogger(__name__)

router = APIRouter()

# Dependencies
require_ngo = require_role(["ngo", "admin"])
require_any_authenticated = require_role(["ngo", "volunteer", "field_worker", "admin"])

def _log_activity(action: str, actor: str, task_id: str) -> None:
    """Best-effort insert into activity_log; never fail request flow on logging errors."""
    details = f"actor={actor};action={action}"
    payload = {
        "action_type": action,
        "task_id": task_id,
        "details": details,
    }

    try:
        payload["actor_id"] = str(UUID(actor))
    except Exception:
        # Keep non-UUID actors in details when actor_id expects UUID.
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
            logger.warning("Failed to write activity log: %s", exc)


def _parse_activity_details(details: Optional[str]) -> dict[str, str]:
    if not isinstance(details, str):
        return {}

    parsed: dict[str, str] = {}
    for part in details.split(";"):
        if "=" not in part:
            continue
        key, value = part.split("=", 1)
        parsed[key.strip().lower()] = value.strip()
    return parsed


def _extract_task_title(row: dict, task_title_map: dict[str, str]) -> str:
    relation = row.get("tasks")
    if isinstance(relation, dict) and relation.get("title"):
        return str(relation["title"])

    task_id = row.get("task_id")
    if isinstance(task_id, str):
        mapped = task_title_map.get(task_id)
        if mapped:
            return mapped

    return "Untitled Task"


def _to_dashboard_activity(row: dict, task_title_map: dict[str, str]) -> dict[str, str]:
    details = _parse_activity_details(row.get("details"))
    action = row.get("action_type") or details.get("action") or "Updated"
    actor = details.get("actor") or row.get("actor_id") or "system"
    event_time = row.get("created_at") or datetime.now(timezone.utc).isoformat()

    return {
        "time": str(event_time),
        "action": str(action),
        "actor": str(actor),
        "task_title": _extract_task_title(row, task_title_map),
    }


def _build_task_title_map(task_ids: list[str]) -> dict[str, str]:
    if not task_ids:
        return {}

    try:
        tasks_res = (
            supabase.table("tasks")
            .select("id, title")
            .in_("id", task_ids)
            .execute()
        )
        return {row["id"]: row["title"] for row in (tasks_res.data or [])}
    except Exception:
        return {}


def _fetch_activity_records(limit: int = 20) -> list[dict]:
    try:
        res = (
            supabase.table("activity_log")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return res.data or []
    except Exception:
        return []


@router.post("/api/tasks/", response_model=TaskResponse, tags=["tasks"])
async def create_task(task: TaskCreate, background_tasks: BackgroundTasks, user: UserContext = Depends(require_ngo)):
    """Create a new community task. Restricted to NGO."""
    try:
        ngo_id = user.ngo_id
        data = task.model_dump(mode="json")
        data["ngo_id"] = ngo_id
        data["status"] = TaskStatus.OPEN.value
        
        # Geocode if necessary
        lat, lng = await ensure_coordinates(data.get("lat"), data.get("lng"), data.get("ward"), data.get("district"))
        data["lat"] = lat
        data["lng"] = lng

        response = supabase.table("tasks").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create task")
        
        new_task = response.data[0]
        
        # Log activity
        _log_activity(action="Created", actor=user.user_id, task_id=new_task["id"])
        
        # Audit Log
        background_tasks.add_task(
            log_audit,
            action_type=AuditActions.TASK_CREATED,
            entity_type="task",
            entity_id=new_task["id"],
            description=f"Task '{new_task['title']}' manually created by NGO {user.user_id}",
            ngo_id=ngo_id,
            user_id=user.user_id,
            user_role=user.role
        )

        # Trigger notifications for high urgency tasks
        if new_task["urgency_score"] >= 60:
            background_tasks.add_task(_handle_urgent_notifications, new_task, ngo_id)

        return new_task
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=400, detail=str(e))


async def _handle_urgent_notifications(task: dict, ngo_id: str):
    """Notify matched volunteers about an urgent task."""
    try:
        # 1. Fetch available volunteers
        vol_res = (
            supabase.table("volunteers")
            .select("*")
            .eq("ngo_id", ngo_id)
            .eq("availability", True)
            .execute()
        )
        volunteers = vol_res.data or []
        
        if not volunteers:
            return

        # 2. Match and pick top 5
        matches = match_volunteers(task, volunteers)
        top5 = matches[:5]
        
        # 3. Send batch SMS
        await send_batch_sms(top5, task)
        
        # 4. Log to activity_log
        _log_activity(
            action="batch_sms_sent", 
            actor="system", 
            task_id=str(task["id"])
        )
    except Exception as e:
        logger.error(f"Failed to handle urgent notifications: {e}")


class AcceptTaskRequest(BaseModel):
    volunteer_id: UUID


@router.post("/api/tasks/{id}/accept", tags=["tasks"])
async def accept_task(id: UUID, req: AcceptTaskRequest, background_tasks: BackgroundTasks, user: UserContext = Depends(require_role(["volunteer", "field_worker"]))):
    """Endpoint for a volunteer to accept an urgent task broadcast. Restricted to volunteers."""
    if str(req.volunteer_id) != user.user_id:
         raise HTTPException(status_code=403, detail="Forbidden: You can only accept tasks for yourself")

    try:
        # 1. Check task status
        task_res = supabase.table("tasks").select("*").eq("id", str(id)).execute()
        if not task_res.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = task_res.data[0]
        if task["status"] != TaskStatus.OPEN.value:
            return {"assigned": False, "message": "Task already taken"}

        # 2. Assign the volunteer (atomic update)
        update_res = (
            supabase.table("tasks")
            .update({"status": TaskStatus.ASSIGNED.value})
            .eq("id", str(id))
            .eq("status", TaskStatus.OPEN.value)
            .execute()
        )
        
        if not update_res.data:
            return {"assigned": False, "message": "Task already taken"}

        # 3. Create assignment record
        assignment_payload = {
            "task_id": str(id),
            "volunteer_id": str(req.volunteer_id),
            "assigned_by": "system_auto_accept",
            "sla_hours": 2,
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "sla_deadline": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
        }
        ins_res = supabase.table("assignments").insert(assignment_payload).execute()
        assignment_id = ins_res.data[0]["id"] if ins_res.data else None

        # 4. Notify winner and notify others
        winner_res = supabase.table("volunteers").select("name, phone").eq("id", str(req.volunteer_id)).execute()
        winner_name = winner_res.data[0]["name"] if winner_res.data else "Volunteer"
        if winner_res.data and winner_res.data[0].get("phone"):
            await send_acceptance_confirmation(
                winner_res.data[0]["phone"], 
                task["title"], 
                task["ward"]
            )
        
        # Send cancellation to other potentially notified volunteers
        vol_res = (
            supabase.table("volunteers")
            .select("*")
            .eq("ngo_id", task["ngo_id"])
            .eq("availability", True)
            .neq("id", str(req.volunteer_id))
            .execute()
        )
        others = match_volunteers(task, vol_res.data or [])[:4]
        other_phones = [o["phone"] for o in others if o.get("phone")]
        if other_phones:
            await send_acceptance_cancellation(other_phones, task["title"])

        _log_activity(action="Assigned", actor=user.user_id, task_id=str(id))
        
        # Audit Log
        background_tasks.add_task(
            log_audit,
            action_type=AuditActions.TASK_ACCEPTED,
            entity_type="assignment",
            entity_id=assignment_id,
            description=f"Task '{task['title']}' accepted by volunteer {winner_name}",
            ngo_id=task["ngo_id"],
            user_id=user.user_id,
            user_role=user.role
        )

        return {"assigned": True, "volunteer_id": req.volunteer_id}

    except Exception as e:
        logger.error(f"Error in accept_task: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/tasks/", response_model=List[TaskResponse], tags=["tasks"])
async def list_tasks(
    status: Optional[TaskStatus] = Query(None, description="Filter by task status"),
    need_type: Optional[NeedType] = Query(None, description="Filter by need type"),
    district: Optional[str] = Query(None, description="Filter by district"),
    user: UserContext = Depends(require_any_authenticated)
):
    """List tasks for the current NGO. Authenticated only."""
    try:
        ngo_id = user.ngo_id
        if not ngo_id:
             raise HTTPException(status_code=403, detail="NGO context missing")

        query = supabase.table("tasks").select("*").eq("ngo_id", ngo_id)
        
        if status:
            query = query.eq("status", status.value)
        if need_type:
            query = query.eq("need_type", need_type.value)
        if district:
            query = query.eq("district", district)
            
        # Order by urgency desc
        query = query.order("urgency_score", desc=True)
        
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.get("/api/tasks/{id}", response_model=TaskResponse, tags=["tasks"])
async def get_task(id: UUID, user: UserContext = Depends(require_any_authenticated)):
    """Retrieve a specific task. Authenticated only."""
    try:
        response = supabase.table("tasks").select("*").eq("id", str(id)).eq("ngo_id", user.ngo_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Task not found in your NGO")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.get("/api/tasks/{id}/match-volunteers", tags=["tasks"])
async def get_smart_task_matches(id: UUID, user: UserContext = Depends(require_ngo)):
    """
    Smart Volunteer Matching Engine endpoint.
    Returns the top 3 best active volunteers for the task.
    """
    try:
        # 1. Fetch task and verify ownership
        task_response = (
            supabase.table("tasks")
            .select("*")
            .eq("id", str(id))
            .eq("ngo_id", user.ngo_id)
            .limit(1)
            .execute()
        )
        if not task_response.data:
            raise HTTPException(status_code=404, detail="Task not found in your NGO")
        
        task = task_response.data[0]

        # 2. Fetch ALL active volunteers for this NGO
        volunteers_response = (
            supabase.table("volunteers")
            .select("*")
            .eq("ngo_id", user.ngo_id)
            .eq("status", "active")
            .eq("availability", True)
            .execute()
        )
        volunteers = volunteers_response.data or []

        # 3. Run the Smart Matching Engine
        matches = match_volunteers(task, volunteers, limit=3)
        
        return {
            "task_id": str(id),
            "total_candidates_searched": len(volunteers),
            "top_matches": matches
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in smart matching: {e}")
        raise HTTPException(status_code=400, detail=f"Matching error: {str(e)}")


@router.post("/api/tasks/{id}/assign", tags=["tasks"])
async def assign_task(id: UUID, assign_data: TaskAssign, background_tasks: BackgroundTasks, user: UserContext = Depends(require_ngo)):
    """Assign a volunteer to a task. Restricted to NGO."""
    try:
        # Check if task is in NGO
        task_res = supabase.table("tasks").select("status, title, ward, ngo_id").eq("id", str(id)).eq("ngo_id", user.ngo_id).execute()
        if not task_res.data:
            raise HTTPException(status_code=404, detail="Task not found in your NGO")
            
        task_info = task_res.data[0]
        if task_info["status"] not in [TaskStatus.OPEN.value, TaskStatus.ESCALATED.value]:
            raise HTTPException(status_code=400, detail="Task is not open for assignment")

        # 1. Update task status
        update_task = supabase.table("tasks").update({"status": TaskStatus.ASSIGNED.value}).eq("id", str(id)).execute()
        
        # 2. Create assignment record
        sla_hours = getattr(assign_data, "sla_hours", None) or 24
        sla_deadline = (datetime.now(timezone.utc) + timedelta(hours=int(sla_hours))).isoformat()

        assignment_payload = {
            "task_id": str(id),
            "volunteer_id": str(assign_data.volunteer_id),
            "assigned_by": user.user_id,
            "sla_hours": int(sla_hours),
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "sla_deadline": sla_deadline,
        }
        insert_res = supabase.table("assignments").insert(assignment_payload).execute()

        # Log activity
        _log_activity(action="Assigned", actor=user.user_id, task_id=str(id))

        # Audit Log
        v_res = supabase.table("volunteers").select("name, phone").eq("id", str(assign_data.volunteer_id)).execute()
        v_name = v_res.data[0]["name"] if v_res.data else "Volunteer"
        
        background_tasks.add_task(
            log_audit,
            action_type=AuditActions.TASK_ASSIGNED,
            entity_type="assignment",
            entity_id=insert_res.data[0]["id"],
            description=f"Task '{task_info['title']}' assigned to volunteer {v_name} by NGO {user.user_id}",
            ngo_id=task_info["ngo_id"],
            user_id=user.user_id,
            user_role=user.role
        )

        # Notify volunteer (SMS)
        if v_res.data and v_res.data[0].get("phone"):
            await send_assignment_sms(
                v_res.data[0]["phone"], 
                task_info["title"], 
                task_info["ward"]
            )

        return insert_res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning task: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/tasks/check-escalations", tags=["tasks"])
async def trigger_escalation_check(background_tasks: BackgroundTasks, user: UserContext = Depends(require_ngo)):
    """Trigger a manual check for task escalations. NGO only."""
    background_tasks.add_task(check_and_escalate_tasks, user.ngo_id)
    return {"status": "Escalation check started in background"}


@router.get("/api/tasks/escalated", response_model=List[TaskResponse], tags=["tasks"])
async def list_escalated_tasks(user: UserContext = Depends(require_ngo)):
    """List all escalated tasks for the current NGO."""
    try:
        response = supabase.table("tasks").select("*").eq("ngo_id", user.ngo_id).eq("status", TaskStatus.ESCALATED.value).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/tasks/{id}/reassign", tags=["tasks"])
async def trigger_manual_reassign(id: UUID, background_tasks: BackgroundTasks, user: UserContext = Depends(require_ngo)):
    """Manually trigger a smart reassignment. NGO only."""
    try:
        await reassign_task(str(id), user.ngo_id)
        
        # Audit Log
        task_res = supabase.table("tasks").select("title").eq("id", str(id)).eq("ngo_id", user.ngo_id).single().execute()
        if not task_res.data:
             raise HTTPException(status_code=404, detail="Task not found in your NGO")

        background_tasks.add_task(
            log_audit,
            action_type=AuditActions.TASK_REASSIGNED,
            entity_type="task",
            entity_id=str(id),
            description=f"Manual smart reassignment triggered for task by NGO {user.user_id}",
            ngo_id=user.ngo_id,
            user_id=user.user_id,
            user_role=user.role
        )
        
        return {"status": "Reassignment triggered"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in manual reassign: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------
# Dashboard Endpoints
# ---------------------

@router.get("/api/dashboard/stats", tags=["dashboard"])
async def get_dashboard_stats(user: UserContext = Depends(require_ngo)):
    """Retrieve top-level operational statistics. NGO only."""
    try:
        ngo_id = user.ngo_id
        # Filter all stats by ngo_id
        open_res = supabase.table("tasks").select("id", count="exact").eq("ngo_id", ngo_id).eq("status", TaskStatus.OPEN.value).limit(1).execute()
        open_count = open_res.count if hasattr(open_res, "count") else 0
        
        assigned_res = supabase.table("tasks").select("id", count="exact").eq("ngo_id", ngo_id).eq("status", TaskStatus.ASSIGNED.value).limit(1).execute()
        in_progress_count = assigned_res.count if hasattr(assigned_res, "count") else 0
        
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        completed_res = supabase.table("assignments").select("id", count="exact").eq("ngo_id", ngo_id).gte("completed_at", today).limit(1).execute()
        completed_today = completed_res.count if hasattr(completed_res, "count") else 0
        
        vol_res = supabase.table("volunteers").select("id", count="exact").eq("ngo_id", ngo_id).eq("availability", True).limit(1).execute()
        active_volunteers = vol_res.count if hasattr(vol_res, "count") else 0

        return {
            "open_count": open_count,
            "in_progress_count": in_progress_count,
            "completed_today": completed_today,
            "active_volunteers": active_volunteers
        }
    except Exception as e:
        handle_db_error(e)


@router.get("/api/dashboard/activity", response_model=List[dict], tags=["dashboard"])
async def get_dashboard_activity(user: UserContext = Depends(require_ngo)):
    """Return latest activity log entries for the current NGO."""
    try:
        # Filter by NGO
        records = (
            supabase.table("activity_log")
            .select("*, tasks!inner(*)")
            .eq("tasks.ngo_id", user.ngo_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        data = records.data or []

        task_ids = [row["task_id"] for row in data if row.get("task_id")]
        task_title_map = _build_task_title_map(task_ids)

        return [_to_dashboard_activity(row, task_title_map) for row in data]
    except Exception as e:
        logger.error(f"Error fetching activity feed: {e}")
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")
