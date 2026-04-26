import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from app.db.supabase_client import supabase, get_current_ngo_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])

@router.get("/")
async def list_audit_logs(
    ngo_id: str = Depends(get_current_ngo_id),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[UUID] = Query(None),
    user_id: Optional[UUID] = Query(None),
    limit: int = Query(50, ge=1, le=200)
):
    """
    List audit logs with optional filtering.
    """
    try:
        query = supabase.table("audit_logs").select("*").eq("ngo_id", ngo_id)
        
        if entity_type:
            query = query.eq("entity_type", entity_type)
        if entity_id:
            query = query.eq("entity_id", str(entity_id))
        if user_id:
            query = query.eq("user_id", str(user_id))
            
        query = query.order("created_at", desc=True).limit(limit)
        
        response = query.execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching audit logs: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{entity_type}/{entity_id}")
async def get_entity_history(
    entity_type: str,
    entity_id: UUID,
    ngo_id: str = Depends(get_current_ngo_id)
):
    """
    Get the full audit history for a specific entity (report, task, volunteer, etc).
    """
    try:
        response = (
            supabase.table("audit_logs")
            .select("*")
            .eq("ngo_id", ngo_id)
            .eq("entity_type", entity_type)
            .eq("entity_id", str(entity_id))
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        logger.error(f"Error fetching entity history: {e}")
        raise HTTPException(status_code=400, detail=str(e))
