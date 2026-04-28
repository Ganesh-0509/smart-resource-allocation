import os
import uuid
from datetime import datetime, timedelta
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

CHENNAI_LOCATIONS = [
    {"name": "Adyar", "lat": 13.0033, "lng": 80.2550},
    {"name": "Velachery", "lat": 12.9815, "lng": 80.2184},
    {"name": "Mylapore", "lat": 13.0330, "lng": 80.2677},
    {"name": "T. Nagar", "lat": 13.0418, "lng": 80.2341},
    {"name": "Anna Nagar", "lat": 13.0850, "lng": 80.2101},
    {"name": "Besant Nagar", "lat": 13.0003, "lng": 80.2667},
    {"name": "Guindy", "lat": 13.0067, "lng": 80.2206},
    {"name": "Nungambakkam", "lat": 13.0583, "lng": 80.2458},
]

def seed_data():
    print("Seeding realistic Chennai mock data...")

    # 1. Create NGOs
    ngos = [
        {"name": "Namma Chennai Foundation", "email": "contact@nammachennai.org", "district": "Chennai", "status": "approved", "org_type": "Trust"},
        {"name": "Adyar Relief Force", "email": "info@adyar-relief.in", "district": "Chennai", "status": "approved", "org_type": "Society"},
        {"name": "Velachery Social Trust", "email": "help@velacherytrust.org", "district": "Chennai", "status": "approved", "org_type": "NGO"},
    ]

    ngo_ids = []
    for ngo in ngos:
        check = supabase.table("ngos").select("id").eq("email", ngo["email"]).execute()
        if not check.data:
            res = supabase.table("ngos").insert({
                "id": str(uuid.uuid4()),
                "name": ngo["name"],
                "email": ngo["email"],
                "status": ngo["status"],
                "district": ngo["district"],
                "org_type": ngo["org_type"],
                "phone": "+91 98765 43210",
                "address": f"{ngo['name']} Headquarters, Chennai",
                "description": f"Dedicated to social welfare in {ngo['district']}."
            }).execute()
            if res.data:
                ngo_ids.append(res.data[0]["id"])
        else:
            ngo_ids.append(check.data[0]["id"])

    # 2. Create Volunteers
    volunteers = [
        {"name": "Arun Kumar", "email": "arun@chennai-vol.in", "location": CHENNAI_LOCATIONS[0]}, # Adyar
        {"name": "Priya Lakshmi", "email": "priya@chennai-vol.in", "location": CHENNAI_LOCATIONS[1]}, # Velachery
        {"name": "Suresh Raina", "email": "suresh@chennai-vol.in", "location": CHENNAI_LOCATIONS[2]}, # Mylapore
        {"name": "Divya Dharshini", "email": "divya@chennai-vol.in", "location": CHENNAI_LOCATIONS[3]}, # T. Nagar
    ]

    for vol in volunteers:
        check = supabase.table("volunteers").select("id").eq("email", vol["email"]).execute()
        if not check.data:
            supabase.table("volunteers").insert({
                "id": str(uuid.uuid4()),
                "name": vol["name"],
                "email": vol["email"],
                "phone": "+91 88888 77777",
                "gender": "male" if "Kumar" in vol["name"] or "Suresh" in vol["name"] else "female",
                "dob": "1995-05-20",
                "skills": ["First Aid", "Food Distribution", "Translation"],
                "lat": vol["location"]["lat"],
                "lng": vol["location"]["lng"],
                "district": "Chennai",
                "ward": vol["location"]["name"],
                "ngo_id": ngo_ids[0],
                "status": "approved",
                "availability": True
            }).execute()

    # 3. Create Tasks
    tasks = [
        {"title": "Flood Relief Kit Distribution", "need_type": "logistics", "urgency_score": 85, "location": CHENNAI_LOCATIONS[1]}, # Velachery
        {"title": "Free Medical Camp - Adyar", "need_type": "medical", "urgency_score": 60, "location": CHENNAI_LOCATIONS[0]}, # Adyar
        {"title": "Community Kitchen Support", "need_type": "nutrition", "urgency_score": 95, "location": CHENNAI_LOCATIONS[3]}, # T. Nagar
    ]

    for task in tasks:
        check = supabase.table("tasks").select("id").eq("title", task["title"]).execute()
        if not check.data:
            supabase.table("tasks").insert({
                "id": str(uuid.uuid4()),
                "ngo_id": ngo_ids[0],
                "title": task["title"],
                "description": f"Urgent {task['need_type']} mission in {task['location']['name']}.",
                "need_type": task["need_type"],
                "urgency_score": task["urgency_score"],
                "lat": task["location"]["lat"],
                "lng": task["location"]["lng"],
                "status": "open",
                "required_skills": ["Teamwork", task["need_type"]],
                "household_count": 10
            }).execute()

    print("Seeding complete!")

if __name__ == "__main__":
    seed_data()
