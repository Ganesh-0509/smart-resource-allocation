import csv
import io
import logging
from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, File, UploadFile, Depends, BackgroundTasks
from pydantic import ValidationError

from app.db.supabase_client import supabase, require_role, UserContext
from app.services.geocoder import geocode_address
from app.models.volunteer import (
    VolunteerCreate,
    VolunteerResponse,
    VolunteerAvailabilityUpdate,
)
from app.utils.errors import handle_db_error
from app.utils.audit import log_audit, AuditActions

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/volunteers", tags=["volunteers"])

# Dependencies
require_ngo = require_role(["ngo", "admin"])
require_volunteer = require_role(["volunteer", "field_worker"])

@router.post("/bulk-upload")
async def bulk_upload_volunteers(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user: UserContext = Depends(require_ngo)
):
    """
    Upload a CSV list of volunteers. Only accessible by NGOs.
    """
    ngo_id = user.ngo_id
    if not ngo_id:
        raise HTTPException(status_code=403, detail="NGO context missing")

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    try:
        content = await file.read()
        decoded = content.decode('utf-8')
        stream = io.StringIO(decoded)
        reader = csv.DictReader(stream)

        inserted = 0
        failed = 0
        errors = []

        for row in reader:
            try:
                name = row.get('name', '').strip()
                phone = row.get('phone', '').strip()
                skills_str = row.get('skills', '').strip()
                ward = row.get('ward', '').strip()
                district = row.get('district', '').strip()

                if not name or not district:
                    raise ValueError("Name and District are required fields")

                # Parse skills (comma separated)
                skills = [s.strip().lower() for s in skills_str.split(',')] if skills_str else []
                
                # Geocode location
                lat, lng = geocode_address(ward, district)

                volunteer_data = {
                    "ngo_id": ngo_id,
                    "name": name,
                    "phone": phone,
                    "skills": skills,
                    "ward": ward,
                    "district": district,
                    "lat": lat,
                    "lng": lng,
                    "availability": True,
                    "status": "pending"
                }

                response = supabase.table("volunteers").insert(volunteer_data).execute()
                
                if response.data:
                    inserted += 1
                else:
                    failed += 1
                    errors.append(f"Row {reader.line_num}: Failed to save to database")

            except Exception as e:
                failed += 1
                errors.append(f"Row {reader.line_num}: {str(e)}")

        # Audit Log for bulk upload
        background_tasks.add_task(
            log_audit,
            action_type="VOLUNTEER_BULK_UPLOAD",
            entity_type="volunteer",
            entity_id=None,
            description=f"Bulk upload performed by {user.user_id}. Successfully inserted: {inserted}, Failed: {failed}",
            ngo_id=ngo_id,
            user_id=user.user_id,
            user_role=user.role
        )

        return {
            "inserted": inserted,
            "failed": failed,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File processing error: {str(e)}")


@router.post("/register", response_model=VolunteerResponse, status_code=201)
async def register_volunteer(volunteer: VolunteerCreate, background_tasks: BackgroundTasks):
    """
    Public registration for volunteers. Role is not required yet.
    """
    try:
        data = volunteer.model_dump(mode="json")
        data["status"] = "pending"
        
        response = supabase.table("volunteers").insert(data).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create volunteer")
            
        new_vol = response.data[0]
        
        # Audit Log
        background_tasks.add_task(
            log_audit,
            action_type=AuditActions.VOLUNTEER_REGISTERED,
            entity_type="volunteer",
            entity_id=new_vol["id"],
            description=f"New volunteer registration: {new_vol['name']}",
            ngo_id=new_vol.get("ngo_id"),
            user_id=new_vol["id"],
            user_role="volunteer"
        )
            
        return new_vol
    except Exception as e:
        handle_db_error(e)


@router.get("/", response_model=List[VolunteerResponse])
async def list_volunteers(
    available_only: bool = Query(False, description="Filter for available volunteers only"),
    skill: Optional[str] = Query(None, description="Filter by a specific skill"),
    status: Optional[str] = Query(None, description="Filter by onboarding status"),
    user: UserContext = Depends(require_ngo)
):
    """Retrieve a list of volunteers for the current NGO."""
    try:
        ngo_id = user.ngo_id
        query = supabase.table("volunteers").select("*").eq("ngo_id", ngo_id)
        
        if available_only:
            query = query.eq("availability", True)
            
        if skill:
            query = query.contains("skills", [skill])
            
        if status:
            query = query.eq("status", status)
            
        response = query.execute()
        return response.data
    except Exception as e:
        handle_db_error(e)


@router.get("/{id}", response_model=VolunteerResponse)
async def get_volunteer(id: UUID, user: UserContext = Depends(require_role(["ngo", "admin", "volunteer"]))):
    """Fetch details of a specific volunteer. Accessible by NGO or the volunteer themselves."""
    try:
        # If volunteer is requesting, ensure it's their own record
        if user.role == "volunteer" and str(id) != user.user_id:
            raise HTTPException(status_code=403, detail="Forbidden: You can only access your own profile")

        response = supabase.table("volunteers").select("*").eq("id", str(id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Volunteer not found")
            
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e)


@router.patch("/{id}/availability", response_model=VolunteerResponse)
async def update_availability(
    id: UUID, 
    update_data: VolunteerAvailabilityUpdate, 
    background_tasks: BackgroundTasks,
    user: UserContext = Depends(require_role(["volunteer", "field_worker"]))
):
    """Toggle a volunteer's own availability."""
    if str(id) != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only update your own availability")

    try:
        response = (
            supabase.table("volunteers")
            .update({"availability": update_data.availability})
            .eq("id", str(id))
            .execute()
        )
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Volunteer not found")
            
        updated_vol = response.data[0]
        
        background_tasks.add_task(
            log_audit,
            action_type="VOLUNTEER_AVAILABILITY_CHANGE",
            entity_type="volunteer",
            entity_id=str(id),
            description=f"Volunteer {updated_vol['name']} availability set to {update_data.availability}",
            ngo_id=updated_vol.get("ngo_id"),
            user_id=str(id),
            user_role="volunteer"
        )
            
        return updated_vol
    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e)


@router.get("/{id}/tasks")
async def get_volunteer_tasks(id: UUID, user: UserContext = Depends(require_role(["volunteer", "ngo"]))):
    """Get all assignments for this volunteer. NGO can see any, volunteer sees their own."""
    if user.role == "volunteer" and str(id) != user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only see your own tasks")

    try:
        response = (
            supabase.table("assignments")
            .select("*, tasks(*)")
            .eq("volunteer_id", str(id))
            .execute()
        )
        return response.data
    except Exception as e:
        handle_db_error(e)


@router.delete("/{id}", response_model=VolunteerResponse)
async def delete_volunteer(id: UUID, background_tasks: BackgroundTasks, user: UserContext = Depends(require_ngo)):
    """Soft delete a volunteer. Only NGO accessible."""
    try:
        response = (
            supabase.table("volunteers")
            .update({"availability": False})
            .eq("id", str(id))
            .eq("ngo_id", user.ngo_id)
            .execute()
        )
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Volunteer not found or not in your NGO")
            
        deleted_vol = response.data[0]
        
        background_tasks.add_task(
            log_audit,
            action_type="VOLUNTEER_SOFT_DELETE",
            entity_type="volunteer",
            entity_id=str(id),
            description=f"Volunteer {deleted_vol['name']} soft-deleted by NGO {user.user_id}",
            ngo_id=deleted_vol.get("ngo_id"),
            user_id=user.user_id,
            user_role="ngo"
        )
            
        return deleted_vol
    except HTTPException:
        raise
    except Exception as e:
        handle_db_error(e)


@router.patch("/{id}/approve", response_model=VolunteerResponse)
async def approve_volunteer(id: UUID, background_tasks: BackgroundTasks, user: UserContext = Depends(require_ngo)):
    """Approve a pending volunteer."""
    return await _update_volunteer_status(id, "approved", user.ngo_id, AuditActions.VOLUNTEER_APPROVED, background_tasks, user)


@router.patch("/{id}/reject", response_model=VolunteerResponse)
async def reject_volunteer(id: UUID, background_tasks: BackgroundTasks, user: UserContext = Depends(require_ngo)):
    """Reject a pending volunteer."""
    return await _update_volunteer_status(id, "rejected", user.ngo_id, AuditActions.VOLUNTEER_REJECTED, background_tasks, user)


@router.patch("/{id}/activate", response_model=VolunteerResponse)
async def activate_volunteer(id: UUID, background_tasks: BackgroundTasks, user: UserContext = Depends(require_ngo)):
    """Activate an approved volunteer."""
    return await _update_volunteer_status(id, "active", user.ngo_id, "VOLUNTEER_ACTIVATED", background_tasks, user)


@router.patch("/{id}/deactivate", response_model=VolunteerResponse)
async def deactivate_volunteer(id: UUID, background_tasks: BackgroundTasks, user: UserContext = Depends(require_ngo)):
    """Deactivate a volunteer."""
    return await _update_volunteer_status(id, "inactive", user.ngo_id, "VOLUNTEER_DEACTIVATED", background_tasks, user)


async def _update_volunteer_status(id: UUID, status: str, ngo_id: str, action: str, background_tasks: BackgroundTasks, user: UserContext):
    try:
        response = (
            supabase.table("volunteers")
            .update({"status": status})
            .eq("id", str(id))
            .eq("ngo_id", ngo_id)
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Volunteer not found or not in your NGO")
            
        updated_vol = response.data[0]
        
        background_tasks.add_task(
            log_audit,
            action_type=action,
            entity_type="volunteer",
            entity_id=str(id),
            description=f"Volunteer {updated_vol['name']} status updated to {status} by {user.user_id}",
            ngo_id=ngo_id,
            user_id=user.user_id,
            user_role=user.role
        )
        
        return updated_vol
    except Exception as e:
        handle_db_error(e)
