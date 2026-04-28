import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.db.supabase_client import supabase, require_role, UserContext
from app.utils.errors import handle_db_error
from app.utils.audit import log_audit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])

require_admin = require_role(["admin"])


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminRegisterRequest(BaseModel):
    email: str
    password: str
    secret_token: str


class NGOStatusUpdate(BaseModel):
    status: str  # 'approved', 'suspended', 'pending'
    reason: Optional[str] = None


@router.post("/register")
def admin_register(req: AdminRegisterRequest):
    """
    Register a new Super Admin. Requires a secret token.
    """
    import os
    master_token = os.getenv("ADMIN_REGISTRATION_TOKEN", "namma-admin-secret-2026")
    
    if req.secret_token != master_token:
        raise HTTPException(status_code=403, detail="Invalid secret token for admin registration.")

    try:
        # 1. Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {
                "data": {
                    "role": "admin"
                }
            }
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Admin registration failed at auth level.")

        # Note: In Supabase, setting metadata via sign_up is common, 
        # but you may also need a trigger to sync it to public.admins table if one exists.
        
        return {
            "message": "Admin account created successfully.",
            "admin_id": auth_response.user.id
        }
    except Exception as e:
        handle_db_error(e)


@router.post("/login")
def admin_login(req: AdminLoginRequest):
    """
    Login for Super Admin. Verifies the user has 'admin' role in metadata.
    """
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
    except Exception as e:
        error_str = str(e).lower()
        logger.error(f"Supabase auth error during admin login: {e}")
        if "invalid login credentials" in error_str or "invalid" in error_str:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        raise HTTPException(status_code=401, detail="Authentication failed. Please check your credentials.")

    if not auth_response.session:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = auth_response.user
    user_meta_role = (user.user_metadata or {}).get("role")
    app_meta_role = (user.app_metadata or {}).get("role")
    role = user_meta_role or app_meta_role

    logger.info(f"Admin login attempt: user_id={user.id}, user_meta_role={user_meta_role}, app_meta_role={app_meta_role}")

    if role != "admin":
        raise HTTPException(
            status_code=403,
            detail=f"Access denied. This login is for Super Admins only. (Detected role: '{role or 'none'}')"
        )

    return {
        "access_token": auth_response.session.access_token,
        "admin_id": user.id,
        "email": user.email,
        "role": "admin"
    }


@router.get("/ngos")
def list_all_ngos(
    status: Optional[str] = None,
    user: UserContext = Depends(require_admin)
):
    """
    Super Admin: List all NGOs on the platform.
    Optionally filter by status (pending, approved, suspended).
    """
    try:
        query = supabase.table("ngos").select("*").order("created_at", desc=True)

        if status:
            query = query.eq("status", status)

        response = query.execute()
        return response.data or []
    except Exception as e:
        handle_db_error(e)


@router.get("/ngos/stats")
def get_platform_stats(user: UserContext = Depends(require_admin)):
    """
    Super Admin: Get high-level platform statistics.
    """
    stats = {
        "total_ngos": 0, "pending_ngos": 0, "approved_ngos": 0, "suspended_ngos": 0,
        "total_volunteers": 0, "active_volunteers": 0,
        "total_tasks": 0, "open_tasks": 0, "completed_tasks": 0
    }
    
    # 1. Fetch NGOs
    try:
        ngos_res = supabase.table("ngos").select("id, status").execute()
        ngos = ngos_res.data or []
        stats["total_ngos"] = len(ngos)
        stats["pending_ngos"] = sum(1 for n in ngos if n.get("status") == "pending")
        stats["approved_ngos"] = sum(1 for n in ngos if n.get("status") == "approved")
        stats["suspended_ngos"] = sum(1 for n in ngos if n.get("status") == "suspended")
    except Exception as e:
        if "42703" in str(e): # status missing
            ngos_res = supabase.table("ngos").select("id").execute()
            stats["total_ngos"] = len(ngos_res.data or [])
            stats["approved_ngos"] = stats["total_ngos"]
        else:
            logger.error(f"Stats Error (NGOs): {e}")

    # 2. Fetch Volunteers
    try:
        vols_res = supabase.table("volunteers").select("id, status").execute()
        vols = vols_res.data or []
        stats["total_volunteers"] = len(vols)
        stats["active_volunteers"] = sum(1 for v in vols if v.get("status") == "active")
    except Exception as e:
        if "42703" in str(e):
            vols_res = supabase.table("volunteers").select("id").execute()
            stats["total_volunteers"] = len(vols_res.data or [])
        else:
            logger.error(f"Stats Error (Vols): {e}")

    # 3. Fetch Tasks
    try:
        tasks_res = supabase.table("tasks").select("id, status").execute()
        tasks = tasks_res.data or []
        stats["total_tasks"] = len(tasks)
        stats["open_tasks"] = sum(1 for t in tasks if t.get("status") == "open")
        stats["completed_tasks"] = sum(1 for t in tasks if t.get("status") == "completed")
    except Exception as e:
        if "42703" in str(e):
            tasks_res = supabase.table("tasks").select("id").execute()
            stats["total_tasks"] = len(tasks_res.data or [])
        else:
            logger.error(f"Stats Error (Tasks): {e}")

    return stats


@router.patch("/ngos/{ngo_id}/status")
def update_ngo_status(
    ngo_id: str,
    update: NGOStatusUpdate,
    user: UserContext = Depends(require_admin)
):
    """
    Super Admin: Approve, suspend, or reset an NGO's verification status.
    """
    allowed_statuses = ["pending", "approved", "suspended"]
    if update.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {', '.join(allowed_statuses)}"
        )

    try:
        response = (
            supabase.table("ngos")
            .update({"status": update.status})
            .eq("id", ngo_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="NGO not found")

        updated_ngo = response.data[0]

        log_audit(
            action_type=f"ADMIN_NGO_{update.status.upper()}",
            entity_type="ngo",
            entity_id=ngo_id,
            description=f"Admin {user.user_id} set NGO '{updated_ngo.get('name')}' status to {update.status}. Reason: {update.reason or 'N/A'}",
            ngo_id=ngo_id,
            user_id=user.user_id,
            user_role="admin"
        )

        return updated_ngo
    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e)


@router.get("/audit-logs")
def get_global_audit_logs(
    limit: int = 50,
    user: UserContext = Depends(require_admin)
):
    """
    Super Admin: Fetch the most recent platform-wide audit logs.
    """
    try:
        response = (
            supabase.table("audit_logs")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return response.data or []
    except Exception as e:
        handle_db_error(e)
