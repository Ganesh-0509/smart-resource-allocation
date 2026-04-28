from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.db.supabase_client import supabase
from app.utils.errors import handle_db_error

router = APIRouter(prefix="/api/auth", tags=["auth"])

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: str
    registration_number: str
    org_type: str
    district: str
    state: str
    address: str
    description: str
    website: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class FieldWorkerLoginRequest(BaseModel):
    phone: str
    pin: str


class FieldWorkerRegisterRequest(BaseModel):
    name: str
    phone: str
    email: str
    designation: str
    base_location: str
    ngo_id: str
    pin: str

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
        
        # Insert NGO details into database with pending status
        ngo_data = {
            "id": user_id,
            "name": req.name,
            "email": req.email,
            "phone": req.phone,
            "registration_number": req.registration_number,
            "org_type": req.org_type,
            "district": req.district,
            "state": req.state,
            "address": req.address,
            "description": req.description,
            "website": req.website,
            "status": "pending"
        }
        
        db_response = supabase.table("ngos").insert(ngo_data).execute()
        
        if not db_response.data:
            raise HTTPException(status_code=500, detail="NGO database record creation failed")
            
        return {
            "ngo_id": user_id,
            "name": req.name,
            "email": req.email,
            "message": "Registration successful! Your account is pending Super Admin approval."
        }
    except Exception as e:
        handle_db_error(e)

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
        
        # Fetch NGO details from database
        ngo_response = supabase.table("ngos").select("name, status").eq("id", user_id).execute()
        
        if not ngo_response or not ngo_response.data or len(ngo_response.data) == 0:
            # If not in NGO table, it might be a volunteer or admin trying to log in here
            raise HTTPException(
                status_code=403, 
                detail="NGO profile not found. If you are a volunteer, please use the volunteer login page."
            )
        
        ngo = ngo_response.data[0]
        
        # Block unapproved NGOs
        if ngo.get("status") == "pending":
            raise HTTPException(
                status_code=403,
                detail="Your NGO registration is pending Super Admin approval. You will be notified once approved."
            )
        if ngo.get("status") == "suspended":
            raise HTTPException(
                status_code=403,
                detail="Your NGO account has been suspended. Please contact support."
            )
            
        return {
            "access_token": auth_response.session.access_token,
            "ngo_id": user_id,
            "name": ngo["name"],
            "status": ngo["status"]
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        handle_db_error(e)

@router.post("/field/register")
def register_field_worker(req: FieldWorkerRegisterRequest):
    """
    Register a new Field Worker. 
    They are tied to an NGO and use a PIN for quick access.
    """
    try:
        # Check if NGO exists and is approved
        ngo_check = supabase.table("ngos").select("status").eq("id", req.ngo_id).execute()
        if not ngo_check.data or ngo_check.data[0]["status"] != "approved":
            raise HTTPException(status_code=400, detail="Target NGO not found or not yet approved.")

        # Create a Supabase Auth user
        auth_response = supabase.auth.sign_up({
            "email": req.email,
            "password": f"field-{req.pin}"
        })
        
        if not auth_response.user:
             raise HTTPException(status_code=400, detail="Auth registration failed")
             
        field_worker_data = {
            "id": auth_response.user.id,
            "ngo_id": req.ngo_id,
            "name": req.name,
            "phone": req.phone,
            "email": req.email,
            "designation": req.designation,
            "base_location": req.base_location,
            "pin_hash": req.pin,
            "status": "active"
        }
        
        db_response = supabase.table("field_workers").insert(field_worker_data).execute()
        
        return {"message": "Field Worker registered successfully", "id": auth_response.user.id}
    except Exception as e:
        handle_db_error(e)

@router.post("/field/login")
def login_field_worker(req: FieldWorkerLoginRequest):
    """
    Login for Field Workers using Phone and PIN.
    """
    try:
        # 1. Find field worker by phone
        res = supabase.table("field_workers").select("*").eq("phone", req.phone).execute()
        if not res.data:
            raise HTTPException(status_code=401, detail="Invalid phone number or PIN")
        
        worker = res.data[0]
        
        # 2. Verify PIN (using plain comparison for now as per previous implementation, but better with hash)
        # Note: If we hashed it in register, we should verify it here.
        if worker.get("pin_hash") != req.pin:
            raise HTTPException(status_code=401, detail="Invalid phone number or PIN")
            
        # 3. Sign in to Supabase Auth to get a token (Field workers have an auth account)
        # Their password is 'field-{pin}' as per register_field_worker
        auth_res = supabase.auth.sign_in_with_password({
            "email": worker["email"],
            "password": f"field-{req.pin}"
        })
        
        if not auth_res.session:
            raise HTTPException(status_code=401, detail="Auth session failed")

        return {
            "access_token": auth_res.session.access_token,
            "field_worker_id": worker["id"],
            "name": worker["name"],
            "role": "field",
            "ngo_id": worker["ngo_id"]
        }
    except Exception as e:
        if isinstance(e, HTTPException): raise e
        handle_db_error(e)


@router.get("/ngos/public")
def get_approved_ngos():
    """
    Publicly list approved NGOs so volunteers can select one during registration.
    """
    try:
        response = supabase.table("ngos").select("id, name, district").eq("status", "approved").execute()
        return response.data or []
    except Exception as e:
        handle_db_error(e)
