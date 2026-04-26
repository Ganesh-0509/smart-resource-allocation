import os
import logging
import jwt
from typing import Optional, List
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import Header, HTTPException, Depends
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the environment variables.")

# Create and export a single Supabase client instance
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class UserContext(BaseModel):
    user_id: str
    role: str
    ngo_id: Optional[str] = None

def test_connection() -> bool:
    try:
        # Query the volunteers table to check connection
        response = supabase.table("volunteers").select("id").limit(1).execute()
        logger.info("Successfully connected to Supabase.")
        return True
    except Exception as e:
        logger.error(f"Error connecting to Supabase: {e}")
        return False

def get_current_user(authorization: str = Header(...)) -> UserContext:
    """
    Dependency to verify the JWT and extract user identity and role.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Invalid or missing Authorization header. Must be 'Bearer <token>'"
        )
    
    token = authorization.split(" ")[1]
    
    try:
        # Verify JWT token
        if not SUPABASE_JWT_SECRET:
            # Fallback to unverified decode ONLY if secret is missing (for local dev transition)
            # This should be replaced with a hard requirement for the secret in production
            logger.warning("SUPABASE_JWT_SECRET not found. Decoding without verification.")
            payload = jwt.decode(token, options={"verify_signature": False})
        else:
            payload = jwt.decode(
                token, 
                SUPABASE_JWT_SECRET, 
                algorithms=["HS256"], 
                audience="authenticated"
            )
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID (sub) not found in token")
        
        # Role discovery logic
        # 1. Check user_metadata first (for performance)
        user_metadata = payload.get("user_metadata", {})
        role = user_metadata.get("role")
        ngo_id = user_metadata.get("ngo_id")

        # 2. If not in metadata, look up in database
        if not role:
            # Check if user is an NGO
            ngo_check = supabase.table("ngos").select("id").eq("id", user_id).execute()
            if ngo_check.data:
                role = "ngo"
                ngo_id = user_id # NGO is their own ngo_id
            else:
                # Check if user is a volunteer
                vol_check = supabase.table("volunteers").select("ngo_id").eq("id", user_id).execute()
                if vol_check.data:
                    role = "volunteer"
                    ngo_id = vol_check.data[0]["ngo_id"]
                else:
                    role = "authenticated" # Generic role

        return UserContext(user_id=user_id, role=role or "authenticated", ngo_id=ngo_id)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")

def require_role(allowed_roles: List[str]):
    """
    Dependency factory to enforce RBAC.
    """
    def role_checker(user: UserContext = Depends(get_current_user)):
        if user.role not in allowed_roles:
            logger.warning(f"Access denied for user {user.user_id}. Role {user.role} not in {allowed_roles}")
            raise HTTPException(
                status_code=403, 
                detail=f"Access forbidden. Required role: {allowed_roles}"
            )
        return user
    return role_checker

# Legacy helper for transition - gradually replace with get_current_user
def get_current_ngo_id(user: UserContext = Depends(require_role(["ngo"]))) -> str:
    if not user.ngo_id:
         raise HTTPException(status_code=403, detail="NGO context required")
    return user.ngo_id
