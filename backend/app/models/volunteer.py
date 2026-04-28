from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from enum import Enum

class VolunteerStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    ACTIVE = "active"
    INACTIVE = "inactive"
    REJECTED = "rejected"

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
    email: str = Field(..., description="Email address for login and notifications")
    phone: Optional[str] = Field(None, description="Contact phone number", examples=["+919876543210"])
    gender: Optional[str] = Field(None, description="Gender of the volunteer")
    dob: Optional[str] = Field(None, description="Date of birth")
    blood_group: Optional[str] = Field(None, description="Blood group")
    skills: List[Skill] = Field(..., description="List of skills the volunteer possesses", examples=[["logistics", "education"]])
    lat: float = Field(..., description="Latitude of the volunteer's exact or approximate location", examples=[28.6139])
    lng: float = Field(..., description="Longitude of the volunteer's exact or approximate location", examples=[77.2090])
    availability: bool = Field(True, description="Whether the volunteer is currently available to take on tasks", examples=[True])
    ward: Optional[str] = Field(None, description="The ward where the volunteer resides", examples=["Ward 12"])
    district: str = Field(..., description="The district where the volunteer resides", examples=["Chennai"])
    address: Optional[str] = Field(None, description="Residential address")
    emergency_contact_name: Optional[str] = Field(None, description="Name of emergency contact")
    emergency_contact_phone: Optional[str] = Field(None, description="Phone of emergency contact")
    id_proof_type: Optional[str] = Field(None, description="Type of ID proof (Aadhar, etc.)")
    id_proof_number: Optional[str] = Field(None, description="ID proof number")
    ngo_id: UUID = Field(..., description="The NGO this volunteer is registering for")

class VolunteerUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Full name of the volunteer", examples=["Ravi Kumar"])
    phone: Optional[str] = Field(None, description="Contact phone number", examples=["+919876543210"])
    skills: Optional[List[Skill]] = Field(None, description="List of skills the volunteer possesses", examples=[["logistics", "education"]])
    lat: Optional[float] = Field(None, description="Latitude of the volunteer's exact or approximate location", examples=[28.6139])
    lng: Optional[float] = Field(None, description="Longitude of the volunteer's exact or approximate location", examples=[77.2090])
    availability: Optional[bool] = Field(None, description="Whether the volunteer is currently available to take on tasks", examples=[True])
    ward: Optional[str] = Field(None, description="The ward where the volunteer resides", examples=["Ward 12"])
    district: Optional[str] = Field(None, description="The district where the volunteer resides", examples=["Chennai"])

class VolunteerResponse(VolunteerCreate):
    id: UUID = Field(..., description="Unique identifier for the volunteer", examples=["123e4567-e89b-12d3-a456-426614174000"])
    status: VolunteerStatus = Field(VolunteerStatus.PENDING, description="Current onboarding status of the volunteer")
    performance_score: float = Field(..., description="Calculated performance score based on past tasks", examples=[4.8])
    total_tasks_done: int = Field(..., description="Total number of tasks successfully completed", examples=[5])
    created_at: datetime = Field(..., description="Timestamp of when the volunteer registered")
    
    model_config = ConfigDict(from_attributes=True)

class VolunteerAvailabilityUpdate(BaseModel):
    availability: bool = Field(..., description="Whether the volunteer is currently available for tasks", examples=[False])
