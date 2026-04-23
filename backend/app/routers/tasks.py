import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db.supabase_client import supabase
from app.models.task import NeedType, TaskAssign, TaskCreate, TaskResponse, TaskStatus
from app.services.matcher import match_volunteers
from app.services.notifier import send_assignment_sms
from app.services.geocoder import ensure_coordinates

logger = logging.getLogger(__name__)

router = APIRouter()


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
        tasks = tasks_res.data or []
        return {
            str(item.get("id")): str(item.get("title") or "Untitled Task")
            for item in tasks
            if item.get("id")
        }
    except Exception as exc:
        logger.warning("Unable to fetch task titles for activity feed: %s", exc)
        return {}


def _fetch_activity_records() -> list[dict]:
    # Primary path: explicit schema currently used in Supabase.
    try:
        response = (
            supabase.table("activity_log")
            .select("created_at, action_type, actor_id, details, task_id, tasks(title)")
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        return response.data or []
    except Exception:
        pass

    # Fallback path for alternate schemas.
    try:
        response = (
            supabase.table("activity_log")
            .select("*, tasks(title)")
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        )
        return response.data or []
    except Exception:
        response = (
            supabase.table("activity_log")
            .select("*")
            .limit(20)
            .execute()
        )
        return response.data or []

# -----------------
# Tasks Endpoints
# -----------------

@router.post("/api/tasks/", response_model=TaskResponse, status_code=201, tags=["tasks"])
async def create_task(task: TaskCreate):
    """Create a new community need task."""
    try:
        data = task.model_dump(mode="json")
        # New tasks usually start as open
        data["status"] = TaskStatus.OPEN.value
        
        # Ensure coordinates are not 0,0
        data["lat"], data["lng"] = ensure_coordinates(
            data.get("lat"), 
            data.get("lng"), 
            data.get("ward"), 
            data.get("district")
        )
        
        response = supabase.table("tasks").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create task")
            
        return response.data[0]
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.get("/api/tasks/", response_model=List[TaskResponse], tags=["tasks"])
async def list_tasks(
    status: Optional[TaskStatus] = Query(None, description="Filter by task status"),
    need_type: Optional[NeedType] = Query(None, description="Filter by need type"),
    district: Optional[str] = Query(None, description="Filter by district")
):
    """List tasks with optional filters, sorted by urgency_score desc."""
    try:
        query = supabase.table("tasks").select("*")
        
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
async def get_task(id: UUID):
    """Retrieve a specific task by its UUID."""
    try:
        response = supabase.table("tasks").select("*").eq("id", str(id)).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Task not found")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.get("/api/tasks/{task_id}/matches", tags=["tasks"])
async def get_task_matches(task_id: UUID):
    """Fetch top volunteer matches for a task using weighted scoring."""
    try:
        task_response = (
            supabase.table("tasks")
            .select("*")
            .eq("id", str(task_id))
            .limit(1)
            .execute()
        )
        if not task_response.data:
            raise HTTPException(status_code=404, detail="Task not found")

        volunteers_response = (
            supabase.table("volunteers")
            .select("*")
            .eq("availability", True)
            .execute()
        )
        volunteers = volunteers_response.data or []

        matches = match_volunteers(task_response.data[0], volunteers)
        return matches[:10]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating task matches: {e}")
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.post("/api/tasks/{id}/assign", tags=["tasks"])
async def assign_task(id: UUID, assign_data: TaskAssign):
    """Assign a volunteer to a task."""
    try:
        # Check if task is open
        task_res = supabase.table("tasks").select("status, title, ward").eq("id", str(id)).execute()
        if not task_res.data:
            raise HTTPException(status_code=404, detail="Task not found")
            
        # Optional: prevent re-assigning if already assigned/completed
        if task_res.data[0]["status"] != TaskStatus.OPEN.value:
            raise HTTPException(status_code=400, detail="Task is not open for assignment")

        # 1. Update task status
        update_task = supabase.table("tasks").update({"status": TaskStatus.ASSIGNED.value}).eq("id", str(id)).execute()
        
        # 2. Create assignment record with SLA deadline (default 24h unless provided)
        sla_hours = getattr(assign_data, "sla_hours", None) or 24
        sla_deadline = (datetime.now(timezone.utc) + timedelta(hours=int(sla_hours))).isoformat()

        assignment_payload = {
            "task_id": str(id),
            "volunteer_id": str(assign_data.volunteer_id),
            "assigned_by": assign_data.assigned_by,
            "sla_hours": int(sla_hours),
            "sla_deadline": sla_deadline,
        }
        insert_res = supabase.table("assignments").insert(assignment_payload).execute()

        # Insert initial assignment history entry
        try:
            if insert_res.data and len(insert_res.data) > 0:
                created_assignment = insert_res.data[0]
                supabase.table("assignment_history").insert({
                    "assignment_id": created_assignment.get("id"),
                    "old_status": None,
                    "new_status": created_assignment.get("status", "assigned"),
                    "changed_by": assign_data.assigned_by,
                }).execute()
        except Exception:
            # Non-fatal - continue
            pass

        # 3. Notify volunteer via SMS (non-blocking for assignment success)
        sms_sent = False
        volunteer_res = (
            supabase.table("volunteers")
            .select("name, phone")
            .eq("id", str(assign_data.volunteer_id))
            .limit(1)
            .execute()
        )

        if volunteer_res.data:
            volunteer = volunteer_res.data[0]
            volunteer_name = volunteer.get("name") or "Volunteer"
            volunteer_phone = volunteer.get("phone")
            task_title = task_res.data[0].get("title") or "Community support task"
            ward = task_res.data[0].get("ward") or "your area"

            if volunteer_phone:
                sms_sent = await send_assignment_sms(
                    volunteer_phone=volunteer_phone,
                    volunteer_name=volunteer_name,
                    task_title=task_title,
                    ward=ward,
                    task_id=str(id),
                )
            else:
                logger.warning("Volunteer %s has no phone number; SMS skipped.", assign_data.volunteer_id)
        else:
            logger.warning("Volunteer %s not found for SMS notification.", assign_data.volunteer_id)

        _log_activity(action="Assigned", actor=assign_data.assigned_by, task_id=str(id))
        
        return {
            "message": "Task assigned successfully",
            "task": update_task.data[0],
            "sms_sent": sms_sent,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning task: {e}")
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.patch("/api/tasks/{id}/complete", tags=["tasks"])
async def complete_task(id: UUID):
    """Mark a task as completed and update volunteer metrics."""
    try:
        # 1. Find the active assignment (without completed_at)
        assignment_res = supabase.table("assignments").select("*").eq("task_id", str(id)).is_("completed_at", "null").execute()
        if not assignment_res.data:
            raise HTTPException(status_code=404, detail="Active assignment not found for this task")
        
        assignment = assignment_res.data[0]
        volunteer_id = assignment["volunteer_id"]
        assignment_id = assignment["id"]
        
        # 2. Update task status
        task_res = supabase.table("tasks").update({"status": TaskStatus.COMPLETED.value}).eq("id", str(id)).execute()
        
        # 3. Update assignment 
        now_iso = datetime.now(timezone.utc).isoformat()
        supabase.table("assignments").update({"completed_at": now_iso}).eq("id", assignment_id).execute()
        
        # 4. Get current volunteer metrics
        vol_res = supabase.table("volunteers").select("total_tasks_done, performance_score").eq("id", volunteer_id).execute()
        if vol_res.data:
            vol = vol_res.data[0]
            total_done = vol.get("total_tasks_done") or 0
            old_score = vol.get("performance_score") or 0.0
            
            # Recalculate: new_score = (old_score * total_done + outcome_score) / (total_done + 1)
            new_score = (old_score * total_done + 100) / (total_done + 1)
            
            # 5. Update volunteer
            supabase.table("volunteers").update({
                "total_tasks_done": total_done + 1,
                "performance_score": round(new_score, 2)
            }).eq("id", volunteer_id).execute()

        _log_activity(action="Completed", actor=str(volunteer_id), task_id=str(id))
            
        return {"message": "Task marked complete and metrics updated", "task": task_res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing task: {e}")
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


# ---------------------
# Dashboard Endpoints
# ---------------------

class HeatmapData(BaseModel):
    lat: float
    lng: float
    urgency_score: int
    title: str
    ward: Optional[str] = None
    need_type: Optional[str] = None
    status: str


class DashboardActivityData(BaseModel):
    time: str
    action: str
    actor: str
    task_title: str

@router.get("/api/dashboard/stats", tags=["dashboard"])
async def get_dashboard_stats():
    """Retrieve top-level operational statistics."""
    try:
        # Get count of open tasks
        open_res = supabase.table("tasks").select("id", count="exact").eq("status", TaskStatus.OPEN.value).limit(1).execute()
        open_count = open_res.count if hasattr(open_res, "count") else 0
        
        # Get count of assigned/in_progress tasks
        assigned_res = supabase.table("tasks").select("id", count="exact").eq("status", TaskStatus.ASSIGNED.value).limit(1).execute()
        in_progress_count = assigned_res.count if hasattr(assigned_res, "count") else 0
        
        # Completed today (tasks table could be used, or assignments tracking completion)
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        # We assume tasks update a completed_at or we can query completed assignments easily. 
        # Using assignments completed_at >= today as a proxy
        completed_res = supabase.table("assignments").select("id", count="exact").gte("completed_at", today).limit(1).execute()
        completed_today = completed_res.count if hasattr(completed_res, "count") else 0
        
        # Active volunteers (availability = true)
        vol_res = supabase.table("volunteers").select("id", count="exact").eq("availability", True).limit(1).execute()
        active_volunteers = vol_res.count if hasattr(vol_res, "count") else 0

        return {
            "open_count": open_count,
            "in_progress_count": in_progress_count,
            "completed_today": completed_today,
            "active_volunteers": active_volunteers
        }
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.get("/api/dashboard/heatmap", response_model=List[HeatmapData], tags=["dashboard"])
async def get_dashboard_heatmap(
    status: str = Query("open", pattern="^(open|all)$", description="open or all"),
):
    """Retrieve geographical distributions for task locations."""
    try:
        query = supabase.table("tasks").select("lat, lng, urgency_score, title, ward, need_type, status")
        if status == "open":
            query = query.eq("status", TaskStatus.OPEN.value)

        response = query.execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching heatmap data: {e}")
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.get("/api/dashboard/activity", response_model=List[DashboardActivityData], tags=["dashboard"])
async def get_dashboard_activity():
    """Return latest activity log entries joined with task title."""
    try:
        records = _fetch_activity_records()

        task_ids = [
            row["task_id"]
            for row in records
            if isinstance(row.get("task_id"), str)
        ]
        task_title_map = _build_task_title_map(task_ids)

        return [_to_dashboard_activity(row, task_title_map) for row in records]
    except Exception as e:
        logger.error(f"Error fetching activity feed: {e}")
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")
