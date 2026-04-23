import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db.supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scheduling", tags=["scheduling"])


class SchedulingSlotCreate(BaseModel):
    volunteer_id: UUID
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: str = Field(..., description="HH:MM format")
    end_time: str = Field(..., description="HH:MM format")
    is_recurring: bool = True


class SchedulingSlotUpdate(BaseModel):
    start_time: str | None = None
    end_time: str | None = None
    is_available: bool | None = None
    is_recurring: bool | None = None


class SchedulingSlotResponse(BaseModel):
    id: UUID
    volunteer_id: UUID
    day_of_week: int
    start_time: str
    end_time: str
    is_recurring: bool
    is_available: bool
    created_at: str
    updated_at: str


class VolunteerScheduleResponse(BaseModel):
    volunteer_id: UUID
    volunteer_name: str
    slots: list[SchedulingSlotResponse]


@router.post("/slots", response_model=SchedulingSlotResponse)
async def create_scheduling_slot(slot: SchedulingSlotCreate):
    """Create a new scheduling slot for a volunteer."""
    try:
        payload = {
            "volunteer_id": str(slot.volunteer_id),
            "day_of_week": slot.day_of_week,
            "start_time": slot.start_time,
            "end_time": slot.end_time,
            "is_recurring": slot.is_recurring,
            "is_available": True,
        }

        response = supabase.table("scheduling_slots").insert(payload).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create scheduling slot.")

        slot_data = response.data[0]
        return SchedulingSlotResponse(
            id=slot_data["id"],
            volunteer_id=slot_data["volunteer_id"],
            day_of_week=slot_data["day_of_week"],
            start_time=slot_data["start_time"],
            end_time=slot_data["end_time"],
            is_recurring=slot_data["is_recurring"],
            is_available=slot_data["is_available"],
            created_at=slot_data["created_at"],
            updated_at=slot_data["updated_at"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create scheduling slot: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to create scheduling slot: {exc}")


@router.get("/volunteer/{volunteer_id}", response_model=VolunteerScheduleResponse)
async def get_volunteer_schedule(volunteer_id: UUID):
    """Get complete schedule for a volunteer."""
    try:
        # Get volunteer
        vol_response = (
            supabase.table("volunteers")
            .select("id, name")
            .eq("id", str(volunteer_id))
            .limit(1)
            .execute()
        )

        if not vol_response.data:
            raise HTTPException(status_code=404, detail="Volunteer not found.")

        volunteer = vol_response.data[0]

        # Get all scheduling slots for this volunteer
        slots_response = (
            supabase.table("scheduling_slots")
            .select("*")
            .eq("volunteer_id", str(volunteer_id))
            .order("day_of_week", desc=False)
            .order("start_time", desc=False)
            .execute()
        )

        slots = [
            SchedulingSlotResponse(
                id=slot["id"],
                volunteer_id=slot["volunteer_id"],
                day_of_week=slot["day_of_week"],
                start_time=slot["start_time"],
                end_time=slot["end_time"],
                is_recurring=slot["is_recurring"],
                is_available=slot["is_available"],
                created_at=slot["created_at"],
                updated_at=slot["updated_at"],
            )
            for slot in (slots_response.data or [])
        ]

        return VolunteerScheduleResponse(
            volunteer_id=volunteer["id"],
            volunteer_name=volunteer["name"],
            slots=slots,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get volunteer schedule: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to get volunteer schedule: {exc}")


@router.put("/slots/{slot_id}", response_model=SchedulingSlotResponse)
async def update_scheduling_slot(slot_id: UUID, updates: SchedulingSlotUpdate):
    """Update a scheduling slot."""
    try:
        update_payload = {}
        if updates.start_time is not None:
            update_payload["start_time"] = updates.start_time
        if updates.end_time is not None:
            update_payload["end_time"] = updates.end_time
        if updates.is_available is not None:
            update_payload["is_available"] = updates.is_available
        if updates.is_recurring is not None:
            update_payload["is_recurring"] = updates.is_recurring

        if not update_payload:
            raise HTTPException(status_code=400, detail="No fields to update.")

        response = (
            supabase.table("scheduling_slots")
            .update(update_payload)
            .eq("id", str(slot_id))
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Scheduling slot not found.")

        slot_data = response.data[0]
        return SchedulingSlotResponse(
            id=slot_data["id"],
            volunteer_id=slot_data["volunteer_id"],
            day_of_week=slot_data["day_of_week"],
            start_time=slot_data["start_time"],
            end_time=slot_data["end_time"],
            is_recurring=slot_data["is_recurring"],
            is_available=slot_data["is_available"],
            created_at=slot_data["created_at"],
            updated_at=slot_data["updated_at"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to update scheduling slot: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to update scheduling slot: {exc}")


@router.delete("/slots/{slot_id}")
async def delete_scheduling_slot(slot_id: UUID):
    """Delete a scheduling slot."""
    try:
        response = supabase.table("scheduling_slots").delete().eq("id", str(slot_id)).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Scheduling slot not found.")

        return {"status": "deleted", "slot_id": str(slot_id)}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to delete scheduling slot: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to delete scheduling slot: {exc}")


@router.get("/availability/{day_of_week}")
async def get_available_volunteers(day_of_week: int):
    """Get all available volunteers for a specific day of the week."""
    try:
        if day_of_week < 0 or day_of_week > 6:
            raise HTTPException(status_code=400, detail="day_of_week must be 0-6.")

        response = (
            supabase.table("scheduling_slots")
            .select("*, volunteers(id, name, phone, lat, lng, performance_score)")
            .eq("day_of_week", day_of_week)
            .eq("is_available", True)
            .order("start_time", desc=False)
            .execute()
        )

        volunteers_map = {}
        for slot in response.data or []:
            vol_data = slot.get("volunteers", {})
            vol_id = vol_data.get("id")
            if vol_id:
                if vol_id not in volunteers_map:
                    volunteers_map[vol_id] = {
                        "id": vol_id,
                        "name": vol_data.get("name"),
                        "phone": vol_data.get("phone"),
                        "lat": vol_data.get("lat"),
                        "lng": vol_data.get("lng"),
                        "performance_score": vol_data.get("performance_score"),
                        "available_slots": [],
                    }
                volunteers_map[vol_id]["available_slots"].append(
                    {
                        "slot_id": slot["id"],
                        "start_time": slot["start_time"],
                        "end_time": slot["end_time"],
                    }
                )

        return {"day_of_week": day_of_week, "available_volunteers": list(volunteers_map.values())}
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to get available volunteers: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to get available volunteers: {exc}")
