from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from enum import Enum

class Skill(str, Enum):
    NUTRITION = "nutrition"
    MEDICAL = "medical"
    EDUCATION = "education"
    LOGISTICS = "logistics"
    COUNSELLING = "counselling"
    CONSTRUCTION = "construction"
    WATER_SANITATION = "water_sanitation"
    LIVELIHOOD = "livelihood"

class VolunteerCreate(BaseModel):
    name: str = Field(..., description="Full name of the volunteer", examples=["Ravi Kumar"])
    phone: Optional[str] = Field(None, description="Contact phone number", examples=["+919876543210"])
    skills: List[Skill] = Field(..., description="List of skills the volunteer possesses", examples=[["logistics", "education"]])
    lat: float = Field(..., description="Latitude of the volunteer's exact or approximate location", examples=[28.6139])
    lng: float = Field(..., description="Longitude of the volunteer's exact or approximate location", examples=[77.2090])
    availability: bool = Field(True, description="Whether the volunteer is currently available to take on tasks", examples=[True])
    ward: Optional[str] = Field(None, description="The ward where the volunteer resides", examples=["Ward 12"])
    district: str = Field(..., description="The district where the volunteer resides", examples=["Madurai"])

class VolunteerUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Full name of the volunteer", examples=["Ravi Kumar"])
    phone: Optional[str] = Field(None, description="Contact phone number", examples=["+919876543210"])
    skills: Optional[List[Skill]] = Field(None, description="List of skills the volunteer possesses", examples=[["logistics", "education"]])
    lat: Optional[float] = Field(None, description="Latitude of the volunteer's exact or approximate location", examples=[28.6139])
    lng: Optional[float] = Field(None, description="Longitude of the volunteer's exact or approximate location", examples=[77.2090])
    availability: Optional[bool] = Field(None, description="Whether the volunteer is currently available to take on tasks", examples=[True])
    ward: Optional[str] = Field(None, description="The ward where the volunteer resides", examples=["Ward 12"])
    district: Optional[str] = Field(None, description="The district where the volunteer resides", examples=["Madurai"])

class VolunteerResponse(VolunteerCreate):
    id: UUID = Field(..., description="Unique identifier for the volunteer", examples=["123e4567-e89b-12d3-a456-426614174000"])
    performance_score: float = Field(..., description="Calculated performance score based on past tasks", examples=[4.8])
    total_tasks_done: int = Field(..., description="Total number of tasks successfully completed", examples=[5])
    created_at: datetime = Field(..., description="Timestamp of when the volunteer registered")
    
    model_config = ConfigDict(from_attributes=True)

class VolunteerAvailabilityUpdate(BaseModel):
    availability: bool = Field(..., description="Whether the volunteer is currently available for tasks", examples=[False])
