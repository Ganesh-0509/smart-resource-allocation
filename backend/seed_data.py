from __future__ import annotations

from datetime import datetime, timedelta, timezone
import os
from typing import Any

from app.db.supabase_client import supabase

DELETE_ORDER = [
    "activity_log",
    "assignments",
    "survey_uploads",
    "tasks",
    "volunteers",
]


class SeedGuardError(RuntimeError):
    """Raised when development seed execution is not explicitly enabled."""


def assert_dev_seed_enabled() -> None:
    """Require an explicit flag to prevent accidental production seeding."""
    flag = os.getenv("ALLOW_DEV_SEED", "").strip().lower()
    if flag not in {"1", "true", "yes"}:
        raise SeedGuardError(
            "Refusing to run seed script. Set ALLOW_DEV_SEED=true (or 1/yes) for local development."
        )


def iso_now_minus(days: int = 0, hours: int = 0) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days, hours=hours)).isoformat()


def clear_table(table_name: str) -> None:
    try:
        (
            supabase.table(table_name)
            .delete()
            .neq("id", "00000000-0000-0000-0000-000000000000")
            .execute()
        )
        print(f"[OK] Cleared table: {table_name}")
    except Exception as exc:
        print(f"[ERROR] Could not clear table '{table_name}': {exc}")


def insert_rows(table_name: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        print(f"[OK] No rows to insert for table: {table_name}")
        return []

    try:
        response = supabase.table(table_name).insert(rows).execute()
        data = response.data or []
        inserted_count = len(data) if data else len(rows)
        print(f"[OK] Inserted {inserted_count} rows into {table_name}")
        return data
    except Exception as exc:
        print(f"[ERROR] Failed inserting into '{table_name}': {exc}")
        return []


def seed_volunteers() -> tuple[list[dict[str, Any]], dict[str, str]]:
    volunteers = [
        {
            "name": "Kavya Meenakshi",
            "phone": "+919876543210",
            "skills": ["nutrition", "medical"],
            "lat": 9.9252,
            "lng": 78.1198,
            "availability": True,
            "performance_score": 92,
            "total_tasks_done": 14,
        },
        {
            "name": "Ravi Kumar",
            "phone": "+919876543211",
            "skills": ["logistics", "construction"],
            "lat": 9.9350,
            "lng": 78.1300,
            "availability": True,
            "performance_score": 88,
            "total_tasks_done": 21,
        },
        {
            "name": "Priya Sundaram",
            "phone": "+919876543212",
            "skills": ["education", "counselling"],
            "lat": 9.9100,
            "lng": 78.1050,
            "availability": True,
            "performance_score": 95,
            "total_tasks_done": 8,
        },
        {
            "name": "Arjun Murugan",
            "phone": "+919876543213",
            "skills": ["medical", "water_sanitation"],
            "lat": 9.9400,
            "lng": 78.1400,
            "availability": True,
            "performance_score": 85,
            "total_tasks_done": 17,
        },
        {
            "name": "Deepa Krishnan",
            "phone": "+919876543214",
            "skills": ["nutrition", "livelihood"],
            "lat": 9.9200,
            "lng": 78.1150,
            "availability": False,
            "performance_score": 79,
            "total_tasks_done": 5,
        },
    ]

    inserted = insert_rows("volunteers", volunteers)
    volunteer_ids = {
        row["name"]: row["id"]
        for row in inserted
        if isinstance(row, dict) and row.get("name") and row.get("id")
    }
    return inserted, volunteer_ids


def seed_tasks() -> tuple[list[dict[str, Any]], dict[str, str]]:
    open_tasks = [
        {
            "title": "Child malnutrition - Ward 7",
            "need_type": "nutrition",
            "urgency_score": 94,
            "ward": "Ward 7 Anna Nagar",
            "district": "Madurai",
            "lat": 9.9260,
            "lng": 78.1210,
            "required_skills": ["nutrition", "medical"],
            "household_count": 3,
            "status": "open",
            "source": "manual",
            "description": "3 households reporting severe child malnutrition, children under 5 affected",
        },
        {
            "title": "Flood relief supplies - Anaiyur",
            "need_type": "shelter",
            "urgency_score": 88,
            "ward": "Anaiyur",
            "district": "Madurai",
            "lat": 9.9380,
            "lng": 78.1320,
            "required_skills": ["logistics", "construction"],
            "household_count": 12,
            "status": "open",
            "source": "manual",
            "description": "12 families displaced by flooding, need shelter materials and food",
        },
        {
            "title": "Medical camp - Thirumangalam",
            "need_type": "medical",
            "urgency_score": 76,
            "ward": "Thirumangalam",
            "district": "Madurai",
            "lat": 9.9120,
            "lng": 78.1080,
            "required_skills": ["medical"],
            "household_count": 45,
            "status": "open",
            "source": "survey",
            "description": "45 elderly residents need medical checkup, no access to hospital",
        },
        {
            "title": "School supply delivery - Melur",
            "need_type": "education",
            "urgency_score": 55,
            "ward": "Melur",
            "district": "Madurai",
            "lat": 9.9420,
            "lng": 78.1420,
            "required_skills": ["education", "logistics"],
            "household_count": 1,
            "status": "open",
            "source": "manual",
            "description": "Government school needs stationery and books for 200 students",
        },
        {
            "title": "Water contamination - Usilampatti",
            "need_type": "water",
            "urgency_score": 91,
            "ward": "Usilampatti",
            "district": "Madurai",
            "lat": 9.9180,
            "lng": 78.1170,
            "required_skills": ["water_sanitation", "medical"],
            "household_count": 28,
            "status": "open",
            "source": "survey",
            "description": "Well water contaminated, 28 families affected, risk of waterborne disease",
        },
        {
            "title": "Livelihood training - Sholavandan",
            "need_type": "livelihood",
            "urgency_score": 42,
            "ward": "Sholavandan",
            "district": "Madurai",
            "lat": 9.9230,
            "lng": 78.1190,
            "required_skills": ["livelihood", "education"],
            "household_count": 8,
            "status": "open",
            "source": "manual",
            "description": "8 women self-help group members need skill training for income generation",
        },
    ]

    completed_tasks = [
        {
            "title": "Nutrition camp - Paravai",
            "need_type": "nutrition",
            "urgency_score": 70,
            "ward": "Paravai",
            "district": "Madurai",
            "lat": 9.9345,
            "lng": 78.1140,
            "required_skills": ["nutrition", "medical"],
            "household_count": 10,
            "status": "completed",
            "source": "manual",
            "description": "Nutrition camp completed for mothers and children in Paravai",
        },
        {
            "title": "Education kit distribution - Kochadai",
            "need_type": "education",
            "urgency_score": 48,
            "ward": "Kochadai",
            "district": "Madurai",
            "lat": 9.9065,
            "lng": 78.0895,
            "required_skills": ["education", "logistics"],
            "household_count": 6,
            "status": "completed",
            "source": "manual",
            "description": "Education kits distributed to children in Kochadai",
        },
    ]

    all_tasks = open_tasks + completed_tasks
    inserted = insert_rows("tasks", all_tasks)
    task_ids = {
        row["title"]: row["id"]
        for row in inserted
        if isinstance(row, dict) and row.get("title") and row.get("id")
    }
    return inserted, task_ids


def seed_assignments(volunteer_ids: dict[str, str], task_ids: dict[str, str]) -> list[dict[str, Any]]:
    assignments = []

    kavya_id = volunteer_ids.get("Kavya Meenakshi")
    priya_id = volunteer_ids.get("Priya Sundaram")
    paravai_task_id = task_ids.get("Nutrition camp - Paravai")
    kochadai_task_id = task_ids.get("Education kit distribution - Kochadai")

    if kavya_id and paravai_task_id:
        assignments.append(
            {
                "task_id": paravai_task_id,
                "volunteer_id": kavya_id,
                "assigned_by": "district_coordinator_madurai",
                "assigned_at": iso_now_minus(days=3),
                "completed_at": iso_now_minus(days=2),
                "outcome": "success",
            }
        )

    if priya_id and kochadai_task_id:
        assignments.append(
            {
                "task_id": kochadai_task_id,
                "volunteer_id": priya_id,
                "assigned_by": "district_coordinator_madurai",
                "assigned_at": iso_now_minus(days=2),
                "completed_at": iso_now_minus(days=1),
                "outcome": "success",
            }
        )

    inserted = insert_rows("assignments", assignments)

    # If outcome column doesn't exist, retry without it.
    if not inserted and assignments:
        retry_rows = []
        for row in assignments:
            retry_rows.append(
                {
                    "task_id": row["task_id"],
                    "volunteer_id": row["volunteer_id"],
                    "assigned_by": row["assigned_by"],
                    "assigned_at": row["assigned_at"],
                    "completed_at": row["completed_at"],
                }
            )
        print("[INFO] Retrying assignments insert without 'outcome' column...")
        inserted = insert_rows("assignments", retry_rows)

    return inserted


def seed_activity_log(task_ids: dict[str, str], volunteer_ids: dict[str, str]) -> list[dict[str, Any]]:
    activity_rows: list[dict[str, Any]] = []

    flood_task = task_ids.get("Flood relief supplies - Anaiyur")
    paravai_task = task_ids.get("Nutrition camp - Paravai")
    medical_task = task_ids.get("Medical camp - Thirumangalam")
    priya_id = volunteer_ids.get("Priya Sundaram")

    if flood_task:
        activity_rows.append(
            {
                "task_id": flood_task,
                "action_type": "Assigned",
                "details": "actor=district_coordinator_madurai;action=Assigned",
                "created_at": iso_now_minus(hours=6),
            }
        )

    if paravai_task:
        row: dict[str, Any] = {
            "task_id": paravai_task,
            "action_type": "Completed",
            "details": "actor=Priya Sundaram;action=Completed",
            "created_at": iso_now_minus(days=1, hours=2),
        }
        if priya_id:
            row["actor_id"] = priya_id
        activity_rows.append(row)

    if medical_task:
        activity_rows.append(
            {
                "task_id": medical_task,
                "action_type": "Submitted",
                "details": "actor=survey_ocr;action=Submitted",
                "created_at": iso_now_minus(hours=2),
            }
        )

    inserted = insert_rows("activity_log", activity_rows)

    # If actor_id causes UUID/type issues, retry without actor_id.
    if not inserted and activity_rows:
        retry_rows = []
        for row in activity_rows:
            retry_rows.append(
                {
                    "task_id": row.get("task_id"),
                    "action_type": row.get("action_type"),
                    "details": row.get("details"),
                    "created_at": row.get("created_at"),
                }
            )
        print("[INFO] Retrying activity_log insert without 'actor_id' column...")
        inserted = insert_rows("activity_log", retry_rows)

    return inserted


def main() -> None:
    assert_dev_seed_enabled()
    print("Starting Supabase development seed for Namma Connect...")

    print("\n[STEP] Clearing tables in FK-safe order...")
    for table in DELETE_ORDER:
        clear_table(table)

    print("\n[STEP] Inserting volunteers...")
    inserted_volunteers, volunteer_ids = seed_volunteers()

    print("\n[STEP] Inserting tasks...")
    inserted_tasks, task_ids = seed_tasks()

    print("\n[STEP] Inserting assignments...")
    seed_assignments(volunteer_ids=volunteer_ids, task_ids=task_ids)

    print("\n[STEP] Inserting activity logs...")
    seed_activity_log(task_ids=task_ids, volunteer_ids=volunteer_ids)

    print(f"Development seed complete: {len(inserted_volunteers)} volunteers, {len(inserted_tasks)} tasks inserted.")


if __name__ == "__main__":
    try:
        main()
    except SeedGuardError as exc:
        print(f"[ERROR] {exc}")
        raise SystemExit(1)
