import os
import logging
import jwt
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import Header, HTTPException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the environment variables.")

# Create and export a single Supabase client instance
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_connection() -> bool:
    try:
        # Query the volunteers table to check connection
        response = supabase.table("volunteers").select("id").limit(1).execute()
        logger.info("Successfully connected to Supabase.")
        return True
    except Exception as e:
        logger.error(f"Error connecting to Supabase: {e}")
        return False

def get_current_ngo_id(authorization: str = Header(...)) -> str:
    """
    Dependency to extract the ngo_id (auth.uid()) from the Supabase JWT Bearer token.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Invalid or missing Authorization header. Must be 'Bearer <token>'"
        )
    
    token = authorization.split(" ")[1]
    try:
        # Decode the JWT without verification for this foundation step.
        # In production, verify using SUPABASE_JWT_SECRET.
        payload = jwt.decode(token, options={"verify_signature": False})
        ngo_id = payload.get("sub")
        if not ngo_id:
            raise HTTPException(status_code=401, detail="NGO ID (sub) not found in token")
        return ngo_id
    except Exception as e:
        logger.error(f"JWT decoding failed: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")
