import os
import logging
from typing import Optional, List
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import Header, HTTPException, Depends
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables (only if not already set, e.g., in local dev)
if not os.getenv("SUPABASE_URL"):
    load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    # Log the names of missing variables (not the values!)
    missing = []
    if not SUPABASE_URL: missing.append("SUPABASE_URL")
    if not SUPABASE_KEY: missing.append("SUPABASE_KEY")
    logger.error(f"Missing environment variables: {', '.join(missing)}")
    raise ValueError(f"Required environment variables are missing: {', '.join(missing)}")

# Create and export a single Supabase client instance
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


class UserContext(BaseModel):
    user_id: str
    role: str
    ngo_id: Optional[str] = None


def test_connection() -> bool:
    try:
        response = supabase.table("volunteers").select("id").limit(1).execute()
        logger.info("Successfully connected to Supabase.")
        return True
    except Exception as e:
        logger.error(f"Error connecting to Supabase: {e}")
        return False


def get_current_user(authorization: Optional[str] = Header(None)) -> UserContext:
    """
    Dependency to verify the JWT and extract user identity and role.
    Uses supabase.auth.get_user() which works for both ES256 and HS256 tokens.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing Authorization header. Must be 'Bearer <token>'"
        )

    token = authorization.split(" ")[1]

    try:
        # Let Supabase verify the token — handles ES256/HS256 automatically
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user = user_response.user
        user_id = user.id

        # Role discovery: check both metadata fields
        user_metadata = user.user_metadata or {}
        app_metadata = user.app_metadata or {}

        role = user_metadata.get("role") or app_metadata.get("role")
        ngo_id = user_metadata.get("ngo_id") or app_metadata.get("ngo_id")

        logger.info(f"Auth OK: user_id={user_id}, role={role}")

        # If no role in metadata, fall back to DB lookup
        if not role:
            ngo_check = supabase.table("ngos").select("id").eq("id", user_id).execute()
            if ngo_check.data:
                role = "ngo"
                ngo_id = user_id
            else:
                vol_check = supabase.table("volunteers").select("ngo_id").eq("id", user_id).execute()
                if vol_check.data:
                    role = "volunteer"
                    ngo_id = vol_check.data[0]["ngo_id"]
                else:
                    role = "authenticated"

        return UserContext(user_id=user_id, role=role or "authenticated", ngo_id=ngo_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")


def require_role(allowed_roles: List[str]):
    """
    Dependency factory to enforce RBAC.
    """
    def role_checker(user: UserContext = Depends(get_current_user)):
        if user.role not in allowed_roles:
            logger.warning(f"Access denied for user {user.user_id}. Role '{user.role}' not in {allowed_roles}")
            raise HTTPException(
                status_code=403,
                detail=f"Access forbidden. Required role: {allowed_roles}"
            )
        return user
    return role_checker


# Helper for NGO-scoped routes
def get_current_ngo_id(user: UserContext = Depends(require_role(["ngo"]))) -> str:
    if not user.ngo_id:
        raise HTTPException(status_code=403, detail="NGO context required")
    return user.ngo_id
