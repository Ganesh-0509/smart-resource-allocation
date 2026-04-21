from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NeedType(str, Enum):
    NUTRITION = "nutrition"
    MEDICAL = "medical"
    SHELTER = "shelter"
    EDUCATION = "education"
    WATER = "water"
    LIVELIHOOD = "livelihood"
    OTHER = "other"


class TaskStatus(str, Enum):
    OPEN = "open"
    ASSIGNED = "assigned"
    COMPLETED = "completed"


class TaskCreate(BaseModel):
    title: str = Field(
        ...,
        description="Short title describing the community need.",
    )
    need_type: NeedType = Field(
        ...,
        description="Category of need reported by field workers.",
    )
    description: Optional[str] = Field(
        default=None,
        description="Additional details about the task.",
    )
    urgency_score: int = Field(
        ...,
        description="Urgency score from 0 (low) to 100 (critical).",
    )
    ward: str = Field(
        ...,
        description="Local ward where the need is located.",
    )
    district: str = Field(
        ...,
        description="District where the need is located.",
    )
    lat: float = Field(
        ...,
        description="Latitude of the need location.",
    )
    lng: float = Field(
        ...,
        description="Longitude of the need location.",
    )
    required_skills: list[str] = Field(
        ...,
        description="Skills required for volunteers to address this task.",
    )
    household_count: int = Field(
        default=1,
        description="Approximate number of households affected.",
    )
    source: str = Field(
        default="manual",
        description="How this task was created (manual, OCR, API, etc.).",
    )

    @field_validator("urgency_score")
    @classmethod
    def validate_urgency_score(cls, value: int) -> int:
        if value < 0 or value > 100:
            raise ValueError("urgency_score must be between 0 and 100")
        return value

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "title": "Urgent clean water distribution",
                    "need_type": "water",
                    "description": "Water tankers needed after pipeline failure.",
                    "urgency_score": 92,
                    "ward": "Ward 12",
                    "district": "Pune",
                    "lat": 18.5204,
                    "lng": 73.8567,
                    "required_skills": ["logistics", "water_sanitation"],
                    "household_count": 45,
                    "source": "manual",
                }
            ]
        }
    )


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(
        default=None,
        description="Short title describing the community need.",
    )
    need_type: Optional[NeedType] = Field(
        default=None,
        description="Category of need reported by field workers.",
    )
    description: Optional[str] = Field(
        default=None,
        description="Additional details about the task.",
    )
    urgency_score: Optional[int] = Field(
        default=None,
        description="Urgency score from 0 (low) to 100 (critical).",
    )
    ward: Optional[str] = Field(
        default=None,
        description="Local ward where the need is located.",
    )
    district: Optional[str] = Field(
        default=None,
        description="District where the need is located.",
    )
    lat: Optional[float] = Field(
        default=None,
        description="Latitude of the need location.",
    )
    lng: Optional[float] = Field(
        default=None,
        description="Longitude of the need location.",
    )
    required_skills: Optional[list[str]] = Field(
        default=None,
        description="Skills required for volunteers to address this task.",
    )
    household_count: Optional[int] = Field(
        default=None,
        description="Approximate number of households affected.",
    )
    source: Optional[str] = Field(
        default=None,
        description="How this task was created (manual, OCR, API, etc.).",
    )

    @field_validator("urgency_score")
    @classmethod
    def validate_urgency_score(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return value
        if value < 0 or value > 100:
            raise ValueError("urgency_score must be between 0 and 100")
        return value

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "urgency_score": 75,
                    "description": "Updated after on-ground verification.",
                    "household_count": 60,
                }
            ]
        }
    )


class TaskResponse(TaskCreate):
    id: UUID = Field(
        ...,
        description="Unique identifier of the task.",
    )
    status: TaskStatus = Field(
        ...,
        description="Current lifecycle status of the task.",
    )
    source_image_url: Optional[str] = Field(
        default=None,
        description="Optional URL to an uploaded image used to create the task.",
    )
    created_at: datetime = Field(
        ...,
        description="Timestamp when the task was created.",
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "id": "b5ee6f56-2360-4f81-a122-0ec9e8db4f7f",
                    "title": "Urgent clean water distribution",
                    "need_type": "water",
                    "description": "Water tankers needed after pipeline failure.",
                    "urgency_score": 92,
                    "ward": "Ward 12",
                    "district": "Pune",
                    "lat": 18.5204,
                    "lng": 73.8567,
                    "required_skills": ["logistics", "water_sanitation"],
                    "household_count": 45,
                    "source": "manual",
                    "status": "open",
                    "source_image_url": "https://example.org/uploads/task-123.jpg",
                    "created_at": "2026-04-19T12:00:00Z",
                }
            ]
        },
    )


class TaskAssign(BaseModel):
    volunteer_id: UUID = Field(
        ...,
        description="ID of the volunteer being assigned to this task.",
    )
    assigned_by: str = Field(
        ...,
        description="Name or identifier of the user assigning the task.",
    )
    sla_hours: Optional[int] = Field(
        default=24,
        description="Optional SLA in hours for this assignment. Defaults to 24 hours."
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "volunteer_id": "cf0dd7f7-f42f-43d0-a84f-4ca2510dbd67",
                    "assigned_by": "district_coordinator_01",
                    "sla_hours": 24,
                }
            ]
        }
    )
