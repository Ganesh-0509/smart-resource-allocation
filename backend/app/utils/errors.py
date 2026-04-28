from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

# Postgres / Supabase Error Codes
ERROR_CODES = {
    "23505": "This record already exists. Please use a different value.",
    "23503": "This operation cannot be completed because a related record is missing.",
    "42703": "Database configuration error. Please contact support.",
    "23502": "A required field is missing.",
    "PGRST116": "Account profile not found. Please ensure you are logging in with the correct account type (NGO/Volunteer).",
}

# Specific Constraint Mapping (Optional but nice)
CONSTRAINT_MESSAGES = {
    "ngos_email_key": "An NGO with this email is already registered.",
    "volunteers_email_key": "A volunteer with this email is already registered.",
    "users_email_key": "This email is already in use.",
}

def handle_db_error(e: Exception):
    """
    Parses database errors and raises a clean HTTPException.
    """
    error_str = str(e)
    logger.error(f"Database error: {error_str}")

    # Check for Supabase/Postgres specific error structure if available
    # Often e has attributes like code, message, etc. if it's from supabase-py
    code = getattr(e, "code", None)
    message = getattr(e, "message", None)
    details = getattr(e, "details", None)

    # If it's a dictionary-like exception (common with some wrappers)
    if not code and isinstance(e.args, tuple) and len(e.args) > 0 and isinstance(e.args[0], dict):
        code = e.args[0].get("code")
        message = e.args[0].get("message")
        details = e.args[0].get("details")

    # Fallback to string parsing if attributes aren't found
    if not code:
        if "23505" in error_str:
            code = "23505"
        elif "23503" in error_str:
            code = "23503"
        elif "23502" in error_str:
            code = "23502"

    # Specific constraint check
    for constraint, msg in CONSTRAINT_MESSAGES.items():
        if constraint in error_str:
            raise HTTPException(status_code=400, detail=msg)

    # Handle Supabase Auth Rate Limits
    if "email rate limit" in error_str.lower():
        raise HTTPException(
            status_code=429, 
            detail="Too many registration attempts. Please wait a few minutes before trying again."
        )

    # General error code check
    if code in ERROR_CODES:
        raise HTTPException(status_code=400, detail=ERROR_CODES[code])

    # Default fallback
    raise HTTPException(status_code=400, detail=message or "An unexpected database error occurred.")
