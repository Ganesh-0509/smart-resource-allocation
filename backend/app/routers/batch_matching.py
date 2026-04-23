import logging
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/batch-matching", tags=["batch-matching"])


class BatchMatchSuggestion(BaseModel):
    task_id: UUID
    volunteer_id: UUID
    match_score: float
    skill_score: float | None = None
    distance_score: float | None = None
    availability_score: float | None = None


class BatchMatchResponse(BaseModel):
    id: str
    task_id: str
    volunteer_id: str
    match_score: float
    skill_score: float | None
    distance_score: float | None
    availability_score: float | None
    suggested_at: str
    accepted_at: str | None = None
    rejected_at: str | None = None


class BatchMatchSuggestRequest(BaseModel):
    open_task_ids: list[str]


class BatchAssignmentRequest(BaseModel):
    task_ids: list[str]
    volunteer_matches: dict[str, list[str]]  # task_id -> [volunteer_ids]
    notes: str | None = None


class BatchAssignmentResponse(BaseModel):
    id: str
    task_count: int
    volunteer_count: int
    matched_count: int
    status: str
    notes: str | None
    created_at: str


@router.post("/suggest", response_model=dict)
async def suggest_batch_matches(request: BatchMatchSuggestRequest):
    """Suggest best volunteer matches for multiple open tasks."""
    try:
        open_task_ids = request.open_task_ids
        if not open_task_ids:
            return {"status": "no_tasks", "suggestions": []}

        # Get all open tasks
        tasks_response = (
            supabase.table("tasks")
            .select("*, assignments(volunteer_id)")
            .eq("status", "open")
            .in_("id", open_task_ids)
            .execute()
        )

        tasks = tasks_response.data or []
        if not tasks:
            return {"status": "no_tasks", "suggestions": []}

        # Get all available volunteers
        volunteers_response = (
            supabase.table("volunteers")
            .select("*")
            .eq("availability", True)
            .execute()
        )
        volunteers = volunteers_response.data or []

        # Safely fetch slots to avoid join errors
        slots_map = {}
        try:
            slots_res = supabase.table("scheduling_slots").select("volunteer_id, day_of_week, start_time, end_time").execute()
            for s in (slots_res.data or []):
                v_id = s["volunteer_id"]
                if v_id not in slots_map:
                    slots_map[v_id] = []
                slots_map[v_id].append(s)
        except Exception as e:
            logger.warning("Could not fetch scheduling slots for matching: %s", e)

        suggestions = []

        # Match each task with best volunteers
        for task in tasks:
            task_id = task["id"]
            required_skills = task.get("required_skills", [])
            task_lat = task["lat"]
            task_lng = task["lng"]

            task_matches = []

            for volunteer in volunteers:
                volunteer_id = volunteer["id"]
                volunteer_skills = set(volunteer.get("skills", []))
                volunteer_lat = volunteer["lat"]
                volunteer_lng = volunteer["lng"]
                
                # Check schedule if slots exist
                v_slots = slots_map.get(volunteer_id, [])
                # (Future logic: filter by current task day/time if applicable)

                # Calculate skill score (0-40 points)
                if required_skills:
                    matched_skills = len([s for s in required_skills if s in volunteer_skills])
                    skill_score = (matched_skills / len(required_skills)) * 40
                else:
                    skill_score = 40

                # Calculate distance score (0-30 points)
                import math

                distance = math.sqrt((task_lat - volunteer_lat) ** 2 + (task_lng - volunteer_lng) ** 2)
                distance_km = distance * 111  # rough conversion
                distance_score = max(0, 30 - (distance_km / 2))

                # Calculate availability score (0-20 points)
                availability_score = 20 if volunteer.get("performance_score", 0) >= 70 else 10
                
                # Bonus for having a defined schedule
                schedule_bonus = 5 if v_slots else 0

                # Overall match score
                match_score = skill_score + distance_score + availability_score + schedule_bonus

                task_matches.append(
                    {
                        "task_id": task_id,
                        "volunteer_id": volunteer_id,
                        "match_score": match_score,
                        "skill_score": skill_score,
                        "distance_score": distance_score,
                        "availability_score": availability_score,
                    }
                )

            # Sort and take top 3 matches per task
            task_matches.sort(key=lambda x: x["match_score"], reverse=True)
            suggestions.extend(task_matches[:3])

        # Store suggestions
        stored_suggestions = []
        for suggestion in suggestions:
            try:
                response = supabase.table("batch_match_suggestions").insert(suggestion).execute()
                if response.data:
                    stored_suggestions.append(response.data[0])
            except Exception:
                pass

        return {
            "status": "suggested",
            "total_tasks": len(tasks),
            "total_suggestions": len(stored_suggestions),
            "suggestions": [
                BatchMatchResponse(
                    id=s["id"],
                    task_id=s["task_id"],
                    volunteer_id=s["volunteer_id"],
                    match_score=s["match_score"],
                    skill_score=s.get("skill_score"),
                    distance_score=s.get("distance_score"),
                    availability_score=s.get("availability_score"),
                    suggested_at=s["suggested_at"],
                    accepted_at=s.get("accepted_at"),
                    rejected_at=s.get("rejected_at"),
                )
                for s in stored_suggestions
            ],
        }
    except Exception as exc:
        logger.exception("Failed to suggest batch matches: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to suggest batch matches: {exc}")


@router.get("/suggestions/{task_id}", response_model=dict)
async def get_task_match_suggestions(task_id: UUID):
    """Get all match suggestions for a specific task."""
    try:
        response = (
            supabase.table("batch_match_suggestions")
            .select("*")
            .eq("task_id", str(task_id))
            .order("match_score", desc=True)
            .execute()
        )

        suggestions = [
            BatchMatchResponse(
                id=s["id"],
                task_id=s["task_id"],
                volunteer_id=s["volunteer_id"],
                match_score=s["match_score"],
                skill_score=s.get("skill_score"),
                distance_score=s.get("distance_score"),
                availability_score=s.get("availability_score"),
                suggested_at=s["suggested_at"],
                accepted_at=s.get("accepted_at"),
                rejected_at=s.get("rejected_at"),
            )
            for s in (response.data or [])
        ]

        return {
            "task_id": str(task_id),
            "total_suggestions": len(suggestions),
            "suggestions": suggestions,
        }
    except Exception as exc:
        logger.exception("Failed to get match suggestions: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to get match suggestions: {exc}")


@router.post("/accept-suggestion/{suggestion_id}")
async def accept_match_suggestion(suggestion_id: UUID):
    """Accept a match suggestion and create assignment."""
    try:
        # Get suggestion
        suggestion_response = (
            supabase.table("batch_match_suggestions")
            .select("*")
            .eq("id", str(suggestion_id))
            .limit(1)
            .execute()
        )

        if not suggestion_response.data:
            raise HTTPException(status_code=404, detail="Suggestion not found.")

        suggestion = suggestion_response.data[0]
        task_id = suggestion["task_id"]
        volunteer_id = suggestion["volunteer_id"]

        # Create assignment
        assignment_payload = {
            "task_id": task_id,
            "volunteer_id": volunteer_id,
            "assigned_by": "batch_matching",
            "status": "assigned",
            "sla_hours": 24,
        }

        assignment_response = supabase.table("assignments").insert(assignment_payload).execute()
        if not assignment_response.data:
            raise HTTPException(status_code=500, detail="Failed to create assignment.")

        # Update suggestion
        supabase.table("batch_match_suggestions").update({"accepted_at": "now()"}).eq(
            "id", str(suggestion_id)
        ).execute()

        return {
            "status": "accepted",
            "suggestion_id": str(suggestion_id),
            "assignment_id": assignment_response.data[0]["id"],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to accept match suggestion: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to accept match suggestion: {exc}")


@router.post("/reject-suggestion/{suggestion_id}")
async def reject_match_suggestion(suggestion_id: UUID, reason: str | None = None):
    """Reject a match suggestion."""
    try:
        # Get suggestion
        suggestion_response = (
            supabase.table("batch_match_suggestions")
            .select("*")
            .eq("id", str(suggestion_id))
            .limit(1)
            .execute()
        )

        if not suggestion_response.data:
            raise HTTPException(status_code=404, detail="Suggestion not found.")

        # Update suggestion
        supabase.table("batch_match_suggestions").update(
            {"rejected_at": "now()"}
        ).eq("id", str(suggestion_id)).execute()

        return {
            "status": "rejected",
            "suggestion_id": str(suggestion_id),
            "reason": reason,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to reject match suggestion: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to reject match suggestion: {exc}")


@router.post("/apply", response_model=BatchAssignmentResponse)
async def apply_batch_assignments(request: BatchAssignmentRequest, created_by: UUID | None = None):
    """Apply batch assignments from match suggestions."""
    try:
        matched_count = 0
        assignment_ids = []

        for task_id, volunteer_ids in request.volunteer_matches.items():
            if not volunteer_ids:
                continue

            # Use first volunteer in list
            volunteer_id = volunteer_ids[0]

            assignment_payload = {
                "task_id": task_id,
                "volunteer_id": volunteer_id,
                "assigned_by": "batch_assignment",
                "status": "assigned",
                "sla_hours": 24,
            }

            try:
                assignment_response = supabase.table("assignments").insert(assignment_payload).execute()
                if assignment_response.data:
                    assignment_ids.append(assignment_response.data[0]["id"])
                    matched_count += 1
            except Exception:
                pass

        # Create batch assignment record
        batch_payload = {
            "created_by": str(created_by) if created_by else None,
            "task_count": len(request.task_ids),
            "volunteer_count": len(set(v for volunteers in request.volunteer_matches.values() for v in volunteers)),
            "matched_count": matched_count,
            "completed_at": "now()",
            "notes": request.notes,
        }

        batch_response = supabase.table("batch_assignments").insert(batch_payload).execute()
        if not batch_response.data:
            raise HTTPException(status_code=500, detail="Failed to create batch assignment record.")

        batch_data = batch_response.data[0]

        return BatchAssignmentResponse(
            id=batch_data["id"],
            task_count=batch_data["task_count"],
            volunteer_count=batch_data["volunteer_count"],
            matched_count=batch_data["matched_count"],
            status="completed" if matched_count > 0 else "partial",
            notes=batch_data.get("notes"),
            created_at=batch_data["created_at"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to apply batch assignments: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to apply batch assignments: {exc}")


@router.get("/history", response_model=dict)
async def get_batch_assignment_history():
    """Get history of batch assignments."""
    try:
        response = (
            supabase.table("batch_assignments")
            .select("*")
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )

        batches = [
            BatchAssignmentResponse(
                id=b["id"],
                task_count=b["task_count"],
                volunteer_count=b["volunteer_count"],
                matched_count=b["matched_count"],
                status="completed" if b.get("completed_at") else "pending",
                notes=b.get("notes"),
                created_at=b["created_at"],
            )
            for b in (response.data or [])
        ]

        return {
            "total": len(batches),
            "batches": batches,
        }
    except Exception as exc:
        if "PGRST205" in str(exc):
            logger.warning("Batch assignment history table missing: %s", exc)
            return {
                "total": 0,
                "batches": [],
                "warning": "Database schema out of sync"
            }
        logger.exception("Failed to get batch assignment history: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to get batch assignment history: {exc}")
