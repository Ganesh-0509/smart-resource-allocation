from __future__ import annotations
import os
import random
from datetime import datetime, timezone
from typing import Any
from app.db.supabase_client import supabase

# FK-safe delete order
DELETE_ORDER = [
    "activity_log",
    "assignments",
    "survey_uploads",
    "batch_assignments",
    "tasks",
    "volunteers",
    "ngos",
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

def clear_table(table_name: str) -> None:
    try:
        supabase.table(table_name).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        print(f"[OK] Cleared table: {table_name}")
    except Exception as exc:
        print(f"[ERROR] Could not clear table '{table_name}': {exc}")

def insert_rows(table_name: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return []
    try:
        response = supabase.table(table_name).insert(rows).execute()
        return response.data or []
    except Exception as exc:
        print(f"[ERROR] Failed inserting into '{table_name}': {exc}")
        return []

# Realistic Data Assets
SKILLS = ["nutrition", "medical", "education", "logistics", "counselling", "construction", "water_sanitation", "livelihood"]

CITIES = {
    "Chennai": {
        "ngo_name": "Aarogya Seva",
        "email": "contact@aarogyaseva.org",
        "focus": "medical",
        "wards": [
            ("Adyar", 13.0012, 80.2565),
            ("Mylapore", 13.0368, 80.2676),
            ("Tambaram", 12.9229, 80.1275),
            ("Velachery", 12.9815, 80.2180),
            ("Kodambakkam", 13.0533, 80.2218)
        ],
        "names": ["Senthil Kumar", "Lakshmi Narayanan", "Rajeshwari", "Muthuvel", "Meenakshi", "Anbarasan", "Kavitha", "Thangadurai", "Sivakumar", "Amudha", "Karthik Raja", "Meera V.", "Vignesh R.", "Priya T.", "Arul J.", "Banu S.", "Selvam N.", "Revathi R.", "Balaji K.", "Devi S."],
        "tasks": [
            "Mobile medical camp for elderly residents",
            "Dengue awareness health screening",
            "First-aid kit distribution in slum areas",
            "PHC immunization drive support",
            "Emergency medical transport coordination"
        ]
    },
    "Bengaluru": {
        "ngo_name": "Vidya Jyothi",
        "email": "info@vidyajyothi.in",
        "focus": "education",
        "wards": [
            ("Koramangala", 12.9352, 77.6245),
            ("Jayanagar", 12.9308, 77.5838),
            ("Whitefield", 12.9698, 77.7499),
            ("Rajajinagar", 12.9907, 77.5530),
            ("Yelahanka", 13.1004, 77.5963)
        ],
        "names": ["Basavaraj", "Shanthamma", "Manjunath B.", "Pushpa K.", "Girish S.", "Rathnamma", "Venkatesh V.", "Suma R.", "Kempanna", "Bhagya G.", "Naveen P.", "Rekha S.", "Anand H.", "Roopa K.", "Suresh M.", "Kavya N.", "Shivu R.", "Netra S.", "Harish T.", "Shanti L."],
        "tasks": [
            "Evening tutoring for urban poor children",
            "Government school library setup",
            "Youth career guidance workshop",
            "Rural digital literacy training",
            "Textbook distribution drive"
        ]
    },
    "Madurai": {
        "ngo_name": "Anna Daan Trust",
        "email": "help@annadaan.org",
        "focus": "nutrition",
        "wards": [
            ("Anna Nagar", 9.9252, 78.1198),
            ("KK Nagar", 9.9193, 78.0747),
            ("Tallakulam", 9.9195, 78.1284),
            ("Kochadai", 9.9367, 78.0831),
            ("Iyer Bungalow", 9.9524, 78.1049)
        ],
        "names": ["Muthu Pandi", "Pandi Selvi", "Karuppiah K.", "Meenakshi P.", "Alagarsamy R.", "Chidambaram V.", "Ponnu S.", "Mariyappan A.", "Selvi K.", "Ganesan M.", "Murugan R.", "Valli S.", "Raman P.", "Lakshmi T.", "Arumugam J.", "Saraswathi K.", "Perumal S.", "Thangam M.", "Jeyam R.", "Rajan V."],
        "tasks": [
            "Community kitchen for flood relief",
            "Maternal nutritional supplement drive",
            "Midday meal quality monitoring",
            "Small farmer organic workshop",
            "Market food waste reduction campaign"
        ]
    }
}

def seed():
    assert_dev_seed_enabled()
    print("Starting realistic NGO data seed for Namma Connect...")

    # Clear existing data
    for table in DELETE_ORDER:
        clear_table(table)

    summary = []

    for city_name, data in CITIES.items():
        # 1. Create NGO
        ngo_row = {
            "name": data["ngo_name"],
            "email": data["email"]
        }
        ngo_inserted = insert_rows("ngos", [ngo_row])
        if not ngo_inserted: continue
        ngo_id = ngo_inserted[0]["id"]
        
        # 2. Create 20 Volunteers
        volunteer_rows = []
        for i in range(20):
            ward_name, lat, lng = random.choice(data["wards"])
            # Add tiny jitter to coordinates
            v_lat = lat + (random.random() - 0.5) * 0.005
            v_lng = lng + (random.random() - 0.5) * 0.005
            
            # Select 2-3 skills, ensuring focus skill is included
            other_skills = [s for s in SKILLS if s != data["focus"]]
            v_skills = [data["focus"]] + random.sample(other_skills, random.randint(1, 2))
            
            volunteer_rows.append({
                "ngo_id": ngo_id,
                "name": data["names"][i],
                "phone": f"+91{random.randint(6000000000, 9999999999)}",
                "skills": v_skills,
                "lat": v_lat,
                "lng": v_lng,
                "ward": ward_name,
                "district": city_name,
                "availability": True,
                "performance_score": random.randint(60, 98),
                "total_tasks_done": random.randint(0, 30)
            })
        
        inserted_volunteers = insert_rows("volunteers", volunteer_rows)

        # 3. Create 5 Tasks
        task_rows = []
        for i in range(5):
            ward_name, lat, lng = random.choice(data["wards"])
            t_lat = lat + (random.random() - 0.5) * 0.002
            t_lng = lng + (random.random() - 0.5) * 0.002
            
            task_rows.append({
                "ngo_id": ngo_id,
                "title": data["tasks"][i],
                "need_type": data["focus"],
                "description": f"Urgent field requirement in {ward_name}: {data['tasks'][i]} needed for local community.",
                "urgency_score": random.randint(50, 95),
                "ward": ward_name,
                "district": city_name,
                "lat": t_lat,
                "lng": t_lng,
                "required_skills": [data["focus"], "logistics"],
                "household_count": random.randint(5, 50),
                "status": "open"
            })
        
        inserted_tasks = insert_rows("tasks", task_rows)
        
        summary.append(f"[OK] {data['ngo_name']} ({city_name}): {len(inserted_volunteers)} volunteers, {len(inserted_tasks)} tasks")

    print("\n--- SEED SUMMARY ---")
    for line in summary:
        print(line)
    print("--------------------")

if __name__ == "__main__":
    try:
        seed()
    except SeedGuardError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")
