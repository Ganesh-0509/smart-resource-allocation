from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class IntakeSource(str, Enum):
    SURVEY = "survey"
    OCR = "ocr"
    FIELD = "field"


class IntakeUrgency(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class IntakeStatus(str, Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    APPROVED = "approved"
    REJECTED = "rejected"


class IntakeReportCreate(BaseModel):
    title: str
    description: Optional[str] = None
    source: IntakeSource
    urgency: IntakeUrgency = IntakeUrgency.MEDIUM
    location_text: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    ngo_id: Optional[UUID] = None
    raw_data: Optional[dict] = None  # Store original survey/OCR data here
    image_url: Optional[str] = None


class IntakeReportUpdate(BaseModel):
    status: Optional[IntakeStatus] = None
    title: Optional[str] = None
    description: Optional[str] = None
    urgency: Optional[IntakeUrgency] = None
    reviewed_by: Optional[UUID] = None


class IntakeReportResponse(IntakeReportCreate):
    id: UUID
    status: IntakeStatus
    possible_duplicate_of: Optional[UUID] = None
    duplicate_score: float = 0.0
    created_at: datetime
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    converted_to_task_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)
