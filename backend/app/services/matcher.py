import math
from typing import Any


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


def match_volunteers(task: dict, volunteers: list[dict]) -> list[dict]:
    """Score and rank volunteers against a task using weighted matching criteria."""
    required_skills = _normalized_skills(task.get("required_skills", []))
    task_lat = _to_float(task.get("lat"), 0.0)
    task_lng = _to_float(task.get("lng"), 0.0)

    available_volunteers = [vol for vol in volunteers if bool(vol.get("availability"))]
    candidate_volunteers = available_volunteers if available_volunteers else volunteers

    ranked: list[dict] = []

    for volunteer in candidate_volunteers:
        volunteer_skills = _normalized_skills(volunteer.get("skills", []))

        if not required_skills:
            skill_score = 100.0
        else:
            matched = len(required_skills.intersection(volunteer_skills))
            skill_score = (matched / len(required_skills)) * 100.0

        volunteer_lat = _to_float(volunteer.get("lat"), 0.0)
        volunteer_lng = _to_float(volunteer.get("lng"), 0.0)
        distance_km = haversine(task_lat, task_lng, volunteer_lat, volunteer_lng)
        distance_score = max(0.0, 100.0 - distance_km * 10.0)

        availability_score = 100.0 if bool(volunteer.get("availability")) else 0.0

        performance_score = _to_float(volunteer.get("performance_score"), 0.0)
        performance_score = min(100.0, max(0.0, performance_score))

        final_score = (
            (skill_score * 0.4)
            + (distance_score * 0.3)
            + (availability_score * 0.2)
            + (performance_score * 0.1)
        )

        enriched = {
            **volunteer,
            "match_score": int(round(final_score)),
            "skill_score": int(round(skill_score)),
            "distance_score": int(round(distance_score)),
            "distance_km": round(distance_km, 1),
        }
        ranked.append(enriched)

    ranked.sort(key=lambda item: item.get("match_score", 0), reverse=True)
    return ranked
