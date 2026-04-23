import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db.supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


class ImpactMetrics(BaseModel):
    total_hours_worked: int
    households_served: int
    tasks_completed: int
    avg_completion_time_hours: float | None = None
    impact_score: float


class DistrictImpactMetrics(BaseModel):
    district: str
    total_households_served: int
    total_tasks_completed: int
    active_volunteers: int
    total_volunteer_hours: int
    avg_task_completion_rate: float


class TaskTemplate(BaseModel):
    name: str
    need_type: str
    description: str | None = None
    base_urgency_score: int = 50
    required_skills: list[str] = Field(default_factory=list)
    estimated_hours: int = 2


class TaskTemplateResponse(TaskTemplate):
    id: str
    is_active: bool
    created_by: str | None
    created_at: str
    updated_at: str


@router.get("/volunteer/{volunteer_id}", response_model=ImpactMetrics)
async def get_volunteer_impact_metrics(volunteer_id: UUID):
    """Get impact metrics for a specific volunteer."""
    try:
        response = (
            supabase.table("volunteer_impact_metrics")
            .select("*")
            .eq("volunteer_id", str(volunteer_id))
            .limit(1)
            .execute()
        )

        if not response.data:
            # Calculate on first request
            metrics = await _calculate_volunteer_metrics(str(volunteer_id))
            return metrics

        data = response.data[0]
        return ImpactMetrics(
            total_hours_worked=data["total_hours_worked"],
            households_served=data["households_served"],
            tasks_completed=data["tasks_completed"],
            avg_completion_time_hours=data["avg_completion_time_hours"],
            impact_score=data["impact_score"],
        )
    except Exception as exc:
        logger.exception("Failed to get volunteer impact metrics: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to get volunteer impact metrics: {exc}")


@router.get("/district/{district_name}", response_model=DistrictImpactMetrics)
async def get_district_impact_metrics(district_name: str):
    """Get impact metrics for a specific district."""
    try:
        response = (
            supabase.table("district_impact_metrics")
            .select("*")
            .eq("district", district_name)
            .limit(1)
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="District not found.")

        data = response.data[0]
        return DistrictImpactMetrics(
            district=data["district"],
            total_households_served=data["total_households_served"],
            total_tasks_completed=data["total_tasks_completed"],
            active_volunteers=data["active_volunteers"],
            total_volunteer_hours=data["total_volunteer_hours"],
            avg_task_completion_rate=data["avg_task_completion_rate"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        if "PGRST205" in str(exc):
            logger.warning("District metrics table missing: %s", exc)
            return DistrictImpactMetrics(
                district=district_name,
                total_households_served=0,
                total_tasks_completed=0,
                active_volunteers=0,
                total_volunteer_hours=0,
                avg_task_completion_rate=0.0
            )
        logger.exception("Failed to get district impact metrics: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to get district impact metrics: {exc}")


@router.get("/all-districts", response_model=dict)
async def get_all_district_metrics():
    """Get impact metrics for all districts."""
    try:
        response = supabase.table("district_impact_metrics").select("*").order("district", desc=False).execute()

        districts = [
            DistrictImpactMetrics(
                district=d["district"],
                total_households_served=d["total_households_served"],
                total_tasks_completed=d["total_tasks_completed"],
                active_volunteers=d["active_volunteers"],
                total_volunteer_hours=d["total_volunteer_hours"],
                avg_task_completion_rate=d["avg_task_completion_rate"],
            )
            for d in (response.data or [])
        ]

        return {
            "total_districts": len(districts),
            "districts": districts,
        }
    except Exception as exc:
        if "PGRST205" in str(exc):
            logger.warning("All districts metrics table missing: %s", exc)
            return {
                "total_districts": 0,
                "districts": [],
                "warning": "Database schema out of sync"
            }
        logger.exception("Failed to get all district metrics: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to get all district metrics: {exc}")


@router.post("/templates", response_model=TaskTemplateResponse)
async def create_task_template(template: TaskTemplate, created_by: UUID | None = None):
    """Create a new task template for recurring tasks."""
    try:
        payload = {
            "name": template.name,
            "need_type": template.need_type,
            "description": template.description,
            "base_urgency_score": template.base_urgency_score,
            "required_skills": template.required_skills,
            "estimated_hours": template.estimated_hours,
            "is_active": True,
        }

        if created_by:
            payload["created_by"] = str(created_by)

        response = supabase.table("task_templates").insert(payload).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create task template.")

        data = response.data[0]
        return TaskTemplateResponse(
            id=data["id"],
            name=data["name"],
            need_type=data["need_type"],
            description=data["description"],
            base_urgency_score=data["base_urgency_score"],
            required_skills=data["required_skills"],
            estimated_hours=data["estimated_hours"],
            is_active=data["is_active"],
            created_by=data.get("created_by"),
            created_at=data["created_at"],
            updated_at=data["updated_at"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create task template: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to create task template: {exc}")


@router.get("/templates", response_model=dict)
async def get_task_templates(active_only: bool = True):
    """Get all task templates."""
    try:
        query = supabase.table("task_templates").select("*")

        if active_only:
            query = query.eq("is_active", True)

        response = query.order("created_at", desc=True).execute()

        templates = [
            TaskTemplateResponse(
                id=t["id"],
                name=t["name"],
                need_type=t["need_type"],
                description=t["description"],
                base_urgency_score=t["base_urgency_score"],
                required_skills=t["required_skills"],
                estimated_hours=t["estimated_hours"],
                is_active=t["is_active"],
                created_by=t.get("created_by"),
                created_at=t["created_at"],
                updated_at=t["updated_at"],
            )
            for t in (response.data or [])
        ]

        return {
            "total": len(templates),
            "templates": templates,
        }
    except Exception as exc:
        logger.exception("Failed to get task templates: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to get task templates: {exc}")


@router.post("/templates/{template_id}/use")
async def create_task_from_template(template_id: UUID, district: str, ward: str, lat: float, lng: float):
    """Create a new task from a template."""
    try:
        # Get template
        template_response = (
            supabase.table("task_templates")
            .select("*")
            .eq("id", str(template_id))
            .limit(1)
            .execute()
        )

        if not template_response.data:
            raise HTTPException(status_code=404, detail="Task template not found.")

        template = template_response.data[0]

        # Create task from template
        task_payload = {
            "title": template["name"],
            "need_type": template["need_type"],
            "description": template["description"],
            "urgency_score": template["base_urgency_score"],
            "ward": ward,
            "district": district,
            "lat": lat,
            "lng": lng,
            "required_skills": template["required_skills"],
            "household_count": 1,
            "source": "template",
            "status": "open",
        }

        task_response = supabase.table("tasks").insert(task_payload).execute()
        if not task_response.data:
            raise HTTPException(status_code=500, detail="Failed to create task from template.")

        return {
            "status": "created",
            "task_id": task_response.data[0]["id"],
            "task": task_response.data[0],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to create task from template: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to create task from template: {exc}")


async def _calculate_volunteer_metrics(volunteer_id: str) -> ImpactMetrics:
    """Calculate impact metrics for a volunteer."""
    try:
        # Get completed assignments
        assignments_response = (
            supabase.table("assignments")
            .select("*, tasks(household_count)")
            .eq("volunteer_id", volunteer_id)
            .eq("status", "completed")
            .execute()
        )

        assignments = assignments_response.data or []

        # Calculate metrics
        tasks_completed = len(assignments)
        total_hours = 0
        households_served = 0

        for assignment in assignments:
            check_in = assignment.get("check_in_time")
            check_out = assignment.get("check_out_time")
            if check_in and check_out:
                from datetime import datetime

                dt_in = datetime.fromisoformat(check_in.replace("Z", "+00:00"))
                dt_out = datetime.fromisoformat(check_out.replace("Z", "+00:00"))
                hours = (dt_out - dt_in).total_seconds() / 3600
                total_hours += hours

            task_data = assignment.get("tasks", {})
            if isinstance(task_data, dict):
                households_served += task_data.get("household_count", 1)

        avg_completion_time = total_hours / tasks_completed if tasks_completed > 0 else 0
        impact_score = min(100, (tasks_completed * 10) + (households_served * 2))

        # Upsert metrics
        payload = {
            "volunteer_id": volunteer_id,
            "total_hours_worked": int(total_hours),
            "households_served": households_served,
            "tasks_completed": tasks_completed,
            "avg_completion_time_hours": avg_completion_time,
            "impact_score": impact_score,
            "last_calculated_at": "now()",
        }

        try:
            supabase.table("volunteer_impact_metrics").upsert(payload).execute()
        except Exception:
            pass  # Silently fail upsert

        return ImpactMetrics(
            total_hours_worked=int(total_hours),
            households_served=households_served,
            tasks_completed=tasks_completed,
            avg_completion_time_hours=avg_completion_time,
            impact_score=impact_score,
        )
    except Exception as exc:
        logger.warning("Failed to calculate volunteer metrics: %s", exc)
        return ImpactMetrics(
            total_hours_worked=0,
            households_served=0,
            tasks_completed=0,
            avg_completion_time_hours=0,
            impact_score=0,
        )
