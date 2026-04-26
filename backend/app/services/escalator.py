import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from app.db.supabase_client import supabase
from app.services.matcher import match_volunteers
from app.services.notifier import send_assignment_sms
from app.models.task import TaskStatus
from app.utils.audit import log_audit, AuditActions

logger = logging.getLogger(__name__)

async def check_and_escalate_tasks(ngo_id: str):
    """
    Check for unaccepted assignments or breached SLAs and escalate them.
    """
    try:
        now = datetime.now(timezone.utc)
        
        # 1. Find assignments that are 'assigned' but not 'accepted' within 2 hours
        two_hours_ago = (now - timedelta(hours=2)).isoformat()
        unaccepted_res = (
            supabase.table("assignments")
            .select("*, tasks(*)")
            .eq("ngo_id", ngo_id)
            .eq("status", "assigned")
            .lt("assigned_at", two_hours_ago)
            .execute()
        )
        
        for assignment in (unaccepted_res.data or []):
            await escalate_assignment(assignment, "Assignment not accepted within 2 hours")

        # 2. Find assignments that are past their SLA deadline and not completed
        overdue_res = (
            supabase.table("assignments")
            .select("*, tasks(*)")
            .eq("ngo_id", ngo_id)
            .neq("status", "completed")
            .neq("status", "failed")
            .lt("sla_deadline", now.isoformat())
            .execute()
        )
        
        for assignment in (overdue_res.data or []):
            await escalate_assignment(assignment, "SLA deadline breached")

    except Exception as e:
        logger.error(f"Error checking escalations: {e}")

async def escalate_assignment(assignment: dict, reason: str):
    """
    Escalate an assignment: mark as escalated and attempt reassignment.
    """
    try:
        task = assignment["tasks"]
        task_id = task["id"]
        ngo_id = task["ngo_id"]
        
        # Mark assignment as escalated
        supabase.table("assignments").update({
            "status": "escalated",
            "escalation_reason": reason
        }).eq("id", assignment["id"]).execute()
        
        # Increment task escalation level
        new_level = task.get("escalation_level", 0) + 1
        supabase.table("tasks").update({
            "status": TaskStatus.ESCALATED.value,
            "escalation_level": new_level
        }).eq("id", task_id).execute()
        
        # Audit Log for Escalation
        await log_audit(
            action_type=AuditActions.ESCALATION_TRIGGERED,
            entity_type="assignment",
            entity_id=assignment["id"],
            description=f"Task '{task['title']}' escalated (Level {new_level}). Reason: {reason}",
            ngo_id=ngo_id,
            user_role="system"
        )
        
        # Attempt smart reassignment
        await reassign_task(task_id, ngo_id)
        
    except Exception as e:
        logger.error(f"Failed to escalate assignment {assignment.get('id')}: {e}")

async def reassign_task(task_id: str, ngo_id: str):
    """
    Find the next best volunteer and assign the task.
    """
    try:
        # Fetch task details
        task_res = supabase.table("tasks").select("*").eq("id", task_id).single().execute()
        if not task_res.data:
            return
        task = task_res.data

        # Get currently assigned volunteers to avoid re-assigning to the same person
        prev_assignments = supabase.table("assignments").select("volunteer_id").eq("task_id", task_id).execute()
        excluded_ids = [a["volunteer_id"] for a in (prev_assignments.data or [])]

        # Fetch available volunteers
        vol_res = (
            supabase.table("volunteers")
            .select("*")
            .eq("ngo_id", ngo_id)
            .eq("status", "active")
            .eq("availability", True)
            .execute()
        )
        volunteers = [v for v in (vol_res.data or []) if v["id"] not in excluded_ids]
        
        if not volunteers:
            logger.warning(f"No available volunteers to reassign task {task_id}")
            return

        # Match and pick the best one
        matches = match_volunteers(task, volunteers)
        if not matches:
            return
        
        new_volunteer = matches[0]
        
        # Create new assignment
        assignment_payload = {
            "task_id": task_id,
            "volunteer_id": new_volunteer["id"],
            "assigned_by": "system_escalation_engine",
            "status": "assigned",
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "sla_deadline": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
        }
        
        ins_res = supabase.table("assignments").insert(assignment_payload).execute()
        supabase.table("tasks").update({"status": TaskStatus.ASSIGNED.value}).eq("id", task_id).execute()
        
        # Audit Log for Reassignment
        await log_audit(
            action_type=AuditActions.TASK_REASSIGNED,
            entity_type="assignment",
            entity_id=ins_res.data[0]["id"] if ins_res.data else None,
            description=f"Task '{task['title']}' automatically reassigned to volunteer {new_volunteer['name']} via escalation engine",
            ngo_id=ngo_id,
            user_role="system"
        )
        
        # Notify the new volunteer
        if new_volunteer.get("phone"):
            await send_assignment_sms(new_volunteer["phone"], task["title"], task["ward"])
            
    except Exception as e:
        logger.error(f"Failed to reassign task {task_id}: {e}")
