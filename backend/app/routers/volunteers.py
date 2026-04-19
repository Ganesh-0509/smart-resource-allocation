from uuid import UUID
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import ValidationError

from app.db.supabase_client import supabase
from app.models.volunteer import (
    VolunteerCreate,
    VolunteerResponse,
    VolunteerAvailabilityUpdate,
)

router = APIRouter(prefix="/api/volunteers", tags=["volunteers"])


@router.post("/register", response_model=VolunteerResponse, status_code=201)
async def register_volunteer(volunteer: VolunteerCreate):
    """Register a new volunteer with their skills and location."""
    try:
        # Convert to JSON serializable dictionary (resolves UUIDs, Enums)
        data = volunteer.model_dump(mode="json")
        
        response = supabase.table("volunteers").insert(data).execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Failed to create volunteer")
            
        return response.data[0]
    except Exception as e:
        # Supabase API errors usually bubble up here
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.get("/", response_model=List[VolunteerResponse])
async def list_volunteers(
    available_only: bool = Query(False, description="Filter for available volunteers only"),
    skill: Optional[str] = Query(None, description="Filter by a specific skill")
):
    """Retrieve a list of volunteers with optional filtering."""
    try:
        query = supabase.table("volunteers").select("*")
        
        if available_only:
            query = query.eq("availability", True)
            
        if skill:
            # Assumes Postgres array column 'skills'
            query = query.contains("skills", [skill])
            
        response = query.execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.get("/{id}", response_model=VolunteerResponse)
async def get_volunteer(id: UUID):
    """Fetch details of a specific volunteer by UUID."""
    try:
        response = supabase.table("volunteers").select("*").eq("id", str(id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Volunteer not found")
            
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.patch("/{id}/availability", response_model=VolunteerResponse)
async def update_availability(id: UUID, update_data: VolunteerAvailabilityUpdate):
    """Toggle or update a volunteer's availability status."""
    try:
        response = (
            supabase.table("volunteers")
            .update({"availability": update_data.availability})
            .eq("id", str(id))
            .execute()
        )
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Volunteer not found")
            
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.get("/{id}/tasks")
async def get_volunteer_tasks(id: UUID):
    """Get all assignments for this volunteer joined with task details."""
    try:
        # Assuming an 'assignments' table joins volunteers with tasks:
        # assignments has volunteer_id and task_id. tasks(*) performs the join.
        response = (
            supabase.table("assignments")
            .select("*, tasks(*)")
            .eq("volunteer_id", str(id))
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")


@router.delete("/{id}", response_model=VolunteerResponse)
async def delete_volunteer(id: UUID):
    """Soft delete a volunteer by marking them as unavailable."""
    try:
        # We soft-delete by setting availability to False
        response = (
            supabase.table("volunteers")
            .update({"availability": False})
            .eq("id", str(id))
            .execute()
        )
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Volunteer not found")
            
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")
