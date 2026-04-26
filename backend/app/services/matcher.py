import math
import logging
from typing import Any, List, Dict

logger = logging.getLogger(__name__)

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return great-circle distance between two lat/lng points in kilometers."""
    earth_radius_km = 6371.0

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_km * c


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalized_skills(skills: Any) -> set[str]:
    if not isinstance(skills, list):
        return set()
    return {str(skill).strip().lower() for skill in skills if str(skill).strip()}


def match_volunteers(task: dict, volunteers: list[dict], limit: int = 3) -> list[dict]:
    """
    Smart Volunteer Matching Engine.
    Scores and ranks volunteers based on:
    - Skill Match (40%)
    - Geographic Proximity (30%)
    - Availability (20%)
    - Reliability (10%)
    """
    required_skills = _normalized_skills(task.get("required_skills", []))
    task_lat = _to_float(task.get("lat"), 0.0)
    task_lng = _to_float(task.get("lng"), 0.0)

    ranked: list[dict] = []

    for volunteer in volunteers:
        # 1. Skill Match Score (40%)
        volunteer_skills = _normalized_skills(volunteer.get("skills", []))
        if not required_skills:
            skill_score = 100.0
        else:
            matched = len(required_skills.intersection(volunteer_skills))
            skill_score = (matched / len(required_skills)) * 100.0

        # 2. Distance Score (30%)
        volunteer_lat = _to_float(volunteer.get("lat"), 0.0)
        volunteer_lng = _to_float(volunteer.get("lng"), 0.0)
        distance_km = haversine(task_lat, task_lng, volunteer_lat, volunteer_lng)
        
        # Closer is better: 100 points for 0km, 0 points for 20km or more
        distance_score = max(0.0, 100.0 - (distance_km * 5.0))

        # 3. Availability Score (20%)
        # In this system, we use the 'availability' boolean as a primary filter, 
        # but we also give maximum points for being currently available.
        availability_score = 100.0 if bool(volunteer.get("availability")) else 0.0

        # 4. Reliability Score (10%)
        # Based on performance_score (success rate) and total_tasks_done (experience)
        perf = _to_float(volunteer.get("performance_score"), 0.0)
        tasks_done = _to_float(volunteer.get("total_tasks_done"), 0.0)
        
        # Reliability is 80% performance, 20% experience (capped at 50 tasks)
        exp_bonus = min(20.0, tasks_done * 0.4)
        reliability_score = (perf * 0.8) + exp_bonus

        # Final Weighted Calculation
        final_score = (
            (skill_score * 0.4)
            + (distance_score * 0.3)
            + (availability_score * 0.2)
            + (reliability_score * 0.1)
        )

        enriched = {
            "id": volunteer["id"],
            "name": volunteer["name"],
            "phone": volunteer.get("phone"),
            "skills": volunteer.get("skills", []),
            "match_score": round(final_score, 1),
            "breakdown": {
                "skill_match": round(skill_score, 1),
                "distance": round(distance_score, 1),
                "availability": round(availability_score, 1),
                "reliability": round(reliability_score, 1)
            },
            "distance_km": round(distance_km, 2),
            "performance_score": volunteer.get("performance_score", 0),
            "total_tasks_done": volunteer.get("total_tasks_done", 0)
        }
        ranked.append(enriched)

    # Sort by score descending
    ranked.sort(key=lambda item: item["match_score"], reverse=True)
    
    return ranked[:limit]
