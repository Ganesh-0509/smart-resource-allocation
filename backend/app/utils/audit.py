import logging
from typing import Optional
from uuid import UUID
from app.db.supabase_client import supabase

logger = logging.getLogger(__name__)

async def log_audit(
    action_type: str,
    entity_type: str,
    entity_id: Optional[str],
    description: str,
    ngo_id: Optional[str] = None,
    user_id: Optional[str] = None,
    user_role: Optional[str] = "system"
):
    """
    Asynchronously log an action to the audit_logs table.
    """
    try:
        payload = {
            "action_type": action_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "description": description,
            "ngo_id": ngo_id,
            "user_id": user_id,
            "user_role": user_role
        }
        
        # Best effort logging - don't let logging failures break business logic
        supabase.table("audit_logs").insert(payload).execute()
    except Exception as e:
        logger.warning(f"Audit logging failed: {e}")

# Predefined action constants for consistency
class AuditActions:
    REPORT_CREATED = "REPORT_CREATED"
    REPORT_REVIEWED = "REPORT_REVIEWED"
    REPORT_APPROVED = "REPORT_APPROVED"
    REPORT_REJECTED = "REPORT_REJECTED"
    TASK_CREATED = "TASK_CREATED"
    TASK_ASSIGNED = "TASK_ASSIGNED"
    TASK_REASSIGNED = "TASK_REASSIGNED"
    TASK_ACCEPTED = "TASK_ACCEPTED"
    TASK_COMPLETED = "TASK_COMPLETED"
    TASK_FAILED = "TASK_FAILED"
    VOLUNTEER_REGISTERED = "VOLUNTEER_REGISTERED"
    VOLUNTEER_APPROVED = "VOLUNTEER_APPROVED"
    VOLUNTEER_REJECTED = "VOLUNTEER_REJECTED"
    ESCALATION_TRIGGERED = "ESCALATION_TRIGGERED"
    DUPLICATE_FLAGGED = "DUPLICATE_FLAGGED"
