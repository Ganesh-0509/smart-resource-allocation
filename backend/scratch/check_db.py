from app.db.supabase_client import supabase
import json

def check_counts():
    try:
        vols = supabase.table("volunteers").select("*").limit(1).execute()
        print(json.dumps(vols.data, indent=2))
    except Exception as e:
        print(e)

if __name__ == "__main__":
    check_counts()
