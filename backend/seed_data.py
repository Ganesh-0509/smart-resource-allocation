from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from app.db.supabase_client import supabase


def utc_iso(days_ago: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


def upsert_by_column(
    table: str,
    lookup_column: str,
    lookup_value: Any,
    payload: dict[str, Any],
    label: str,
) -> dict[str, Any]:
    existing = (
        supabase.table(table)
        .select("id")
        .eq(lookup_column, lookup_value)
        .limit(1)
        .execute()
    )

    if existing.data:
        row_id = existing.data[0]["id"]
        updated = supabase.table(table).update(payload).eq("id", row_id).execute()
        if not updated.data:
            raise RuntimeError(f"Failed to update {label}")
        print(f"[OK] Updated {label} in '{table}' (id={row_id})")
        return updated.data[0]

    inserted = supabase.table(table).insert(payload).execute()
    if not inserted.data:
        raise RuntimeError(f"Failed to insert {label}")
    row = inserted.data[0]
    print(f"[OK] Inserted {label} in '{table}' (id={row.get('id')})")
    return row


def upsert_assignment(
    payload: dict[str, Any],
    label: str,
) -> dict[str, Any]:
    existing = (
        supabase.table("assignments")
        .select("id")
        .eq("task_id", payload["task_id"])
        .eq("volunteer_id", payload["volunteer_id"])
        .limit(1)
        .execute()
    )

    if existing.data:
        assignment_id = existing.data[0]["id"]
        updated = (
            supabase.table("assignments")
            .update(payload)
            .eq("id", assignment_id)
            .execute()
        )
        if not updated.data:
            raise RuntimeError(f"Failed to update {label}")
        print(f"[OK] Updated {label} in 'assignments' (id={assignment_id})")
        return updated.data[0]

    inserted = supabase.table("assignments").insert(payload).execute()
    if not inserted.data:
        raise RuntimeError(f"Failed to insert {label}")
    row = inserted.data[0]
    print(f"[OK] Inserted {label} in 'assignments' (id={row.get('id')})")
    return row


def seed_volunteers() -> dict[str, str]:
    volunteers = [
        {
            "name": "Kavya Meenakshi",
            "phone": "+919850001001",
            "skills": ["nutrition", "medical"],
            "lat": 9.9252,
            "lng": 78.1198,
            "availability": True,
            "performance_score": 92,
            "total_tasks_done": 14,
        },
        {
            "name": "Ravi Kumar",
            "phone": "+919850001002",
            "skills": ["logistics", "construction"],
            "lat": 9.9350,
            "lng": 78.1300,
            "availability": True,
            "performance_score": 88,
            "total_tasks_done": 21,
        },
        {
            "name": "Priya Sundaram",
            "phone": "+919850001003",
            "skills": ["education", "counselling"],
            "lat": 9.9100,
            "lng": 78.1050,
            "availability": True,
            "performance_score": 95,
            "total_tasks_done": 8,
        },
        {
            "name": "Arjun Murugan",
            "phone": "+919850001004",
            "skills": ["medical", "water_sanitation"],
            "lat": 9.9400,
            "lng": 78.1400,
            "availability": True,
            "performance_score": 85,
            "total_tasks_done": 17,
        },
        {
            "name": "Deepa Krishnan",
            "phone": "+919850001005",
            "skills": ["nutrition", "livelihood"],
            "lat": 9.9200,
            "lng": 78.1150,
            "availability": False,
            "performance_score": 79,
            "total_tasks_done": 5,
        },
    ]

    volunteer_ids: dict[str, str] = {}

    for volunteer in volunteers:
        row = upsert_by_column(
            table="volunteers",
            lookup_column="name",
            lookup_value=volunteer["name"],
            payload=volunteer,
            label=f"volunteer '{volunteer['name']}'",
        )
        volunteer_ids[volunteer["name"]] = row["id"]

    return volunteer_ids


def seed_tasks() -> dict[str, str]:
    open_tasks = [
        {
            "title": "Child malnutrition in Ward 7",
            "need_type": "nutrition",
            "description": "Anganwadi workers reported severe child malnutrition in Ward 7 with irregular food access and urgent need for nutrition and pediatric support.",
            "urgency_score": 94,
            "ward": "Ward 7",
            "district": "Madurai",
            "lat": 9.9265,
            "lng": 78.1210,
            "required_skills": ["nutrition", "medical"],
            "household_count": 34,
            "source": "manual",
            "status": "open",
        },
        {
            "title": "Flood relief in Anaiyur",
            "need_type": "shelter",
            "description": "Recent flooding damaged homes in Anaiyur. Families need relief materials, temporary shelter setup, and debris clearing support.",
            "urgency_score": 88,
            "ward": "Anaiyur",
            "district": "Madurai",
            "lat": 9.9630,
            "lng": 78.1420,
            "required_skills": ["logistics", "construction"],
            "household_count": 52,
            "source": "manual",
            "status": "open",
        },
        {
            "title": "Medical camp in Thirumangalam",
            "need_type": "medical",
            "description": "Field workers requested a weekend medical camp in Thirumangalam for fever screening and basic treatment.",
            "urgency_score": 76,
            "ward": "Thirumangalam",
            "district": "Madurai",
            "lat": 9.8216,
            "lng": 77.9872,
            "required_skills": ["medical"],
            "household_count": 28,
            "source": "manual",
            "status": "open",
        },
        {
            "title": "School supplies in Melur",
            "need_type": "education",
            "description": "Government school in Melur reported shortage of notebooks and basic learning supplies for children from low-income households.",
            "urgency_score": 55,
            "ward": "Melur",
            "district": "Madurai",
            "lat": 10.0322,
            "lng": 78.3390,
            "required_skills": ["education"],
            "household_count": 41,
            "source": "manual",
            "status": "open",
        },
        {
            "title": "Water contamination in Usilampatti",
            "need_type": "water",
            "description": "Residents in Usilampatti reported foul-smelling drinking water. Immediate testing, awareness, and medical checkups are required.",
            "urgency_score": 91,
            "ward": "Usilampatti",
            "district": "Madurai",
            "lat": 9.9655,
            "lng": 77.7869,
            "required_skills": ["water_sanitation", "medical"],
            "household_count": 47,
            "source": "manual",
            "status": "open",
        },
        {
            "title": "Livelihood training in Sholavandan",
            "need_type": "livelihood",
            "description": "Women self-help groups in Sholavandan requested structured livelihood and financial literacy sessions.",
            "urgency_score": 42,
            "ward": "Sholavandan",
            "district": "Madurai",
            "lat": 10.0063,
            "lng": 77.9665,
            "required_skills": ["livelihood", "education"],
            "household_count": 30,
            "source": "manual",
            "status": "open",
        },
    ]

    completed_tasks = [
        {
            "title": "Post-flood sanitation drive in Sellur",
            "need_type": "water",
            "description": "A sanitation and cleaning drive was completed in flood-affected streets of Sellur to reduce water-borne disease risk.",
            "urgency_score": 83,
            "ward": "Sellur",
            "district": "Madurai",
            "lat": 9.9381,
            "lng": 78.1098,
            "required_skills": ["water_sanitation", "logistics"],
            "household_count": 26,
            "source": "manual",
            "status": "completed",
            "volunteer_name": "Arjun Murugan",
            "assigned_by": "district_coordinator_madurai",
            "assigned_at": utc_iso(5),
            "completed_at": utc_iso(4),
        },
        {
            "title": "Anaemia screening camp in Koodal Nagar",
            "need_type": "medical",
            "description": "A focused anaemia screening camp was completed for adolescent girls and mothers in Koodal Nagar.",
            "urgency_score": 68,
            "ward": "Koodal Nagar",
            "district": "Madurai",
            "lat": 9.9465,
            "lng": 78.1264,
            "required_skills": ["medical", "nutrition"],
            "household_count": 33,
            "source": "manual",
            "status": "completed",
            "volunteer_name": "Kavya Meenakshi",
            "assigned_by": "district_coordinator_madurai",
            "assigned_at": utc_iso(3),
            "completed_at": utc_iso(2),
        },
    ]

    task_ids: dict[str, str] = {}

    for task in open_tasks:
        row = upsert_by_column(
            table="tasks",
            lookup_column="title",
            lookup_value=task["title"],
            payload=task,
            label=f"open task '{task['title']}'",
        )
        task_ids[task["title"]] = row["id"]

    for task in completed_tasks:
        task_payload = {
            "title": task["title"],
            "need_type": task["need_type"],
            "description": task["description"],
            "urgency_score": task["urgency_score"],
            "ward": task["ward"],
            "district": task["district"],
            "lat": task["lat"],
            "lng": task["lng"],
            "required_skills": task["required_skills"],
            "household_count": task["household_count"],
            "source": task["source"],
            "status": "completed",
        }

        row = upsert_by_column(
            table="tasks",
            lookup_column="title",
            lookup_value=task["title"],
            payload=task_payload,
            label=f"completed task '{task['title']}'",
        )
        task_ids[task["title"]] = row["id"]

    return task_ids


def seed_assignments(
    volunteer_ids: dict[str, str],
    task_ids: dict[str, str],
) -> None:
    completed_task_assignments = [
        {
            "task_title": "Post-flood sanitation drive in Sellur",
            "volunteer_name": "Arjun Murugan",
            "assigned_by": "district_coordinator_madurai",
            "assigned_at": utc_iso(5),
            "completed_at": utc_iso(4),
        },
        {
            "task_title": "Anaemia screening camp in Koodal Nagar",
            "volunteer_name": "Kavya Meenakshi",
            "assigned_by": "district_coordinator_madurai",
            "assigned_at": utc_iso(3),
            "completed_at": utc_iso(2),
        },
    ]

    for item in completed_task_assignments:
        task_id = task_ids[item["task_title"]]
        volunteer_id = volunteer_ids[item["volunteer_name"]]

        payload = {
            "task_id": task_id,
            "volunteer_id": volunteer_id,
            "assigned_by": item["assigned_by"],
            "assigned_at": item["assigned_at"],
            "completed_at": item["completed_at"],
        }

        upsert_assignment(
            payload=payload,
            label=f"assignment '{item['task_title']}' -> {item['volunteer_name']}",
        )


def main() -> None:
    print("Starting Supabase seed for Smart Resource Allocation demo data...")

    volunteer_ids = seed_volunteers()
    task_ids = seed_tasks()
    seed_assignments(volunteer_ids=volunteer_ids, task_ids=task_ids)

    print("Seed completed successfully.")
    print("Run command: python seed_data.py")


if __name__ == "__main__":
    main()
