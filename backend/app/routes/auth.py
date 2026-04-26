from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db.supabase_client import supabase

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
def register_ngo(req: RegisterRequest):
    """
    Register a new NGO:
    1. Create a user in Supabase Auth.
    2. Insert a record in the 'ngos' table using the same ID.
    """
    try:
        # Create Supabase Auth user
        auth_response = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password
        })
        
        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Registration failed at Auth level")
        
        user_id = auth_response.user.id
        
        # Insert NGO details into database
        ngo_data = {
            "id": user_id,
            "name": req.name,
            "email": req.email
        }
        
        db_response = supabase.table("ngos").insert(ngo_data).execute()
        
        if not db_response.data:
            raise HTTPException(status_code=500, detail="NGO database record creation failed")
            
        return {
            "ngo_id": user_id,
            "name": req.name,
            "email": req.email
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
def login_ngo(req: LoginRequest):
    """
    Login an NGO:
    1. Sign in via Supabase Auth.
    2. Retrieve NGO details from 'ngos' table.
    """
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        
        if not auth_response.session:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user_id = auth_response.user.id
        
        # Fetch NGO name from database
        ngo_response = supabase.table("ngos").select("name").eq("id", user_id).single().execute()
        
        if not ngo_response.data:
            raise HTTPException(status_code=404, detail="NGO profile not found in database")
            
        return {
            "access_token": auth_response.session.access_token,
            "ngo_id": user_id,
            "name": ngo_response.data["name"]
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
