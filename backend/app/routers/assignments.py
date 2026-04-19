from fastapi import APIRouter

router = APIRouter(prefix="/api/assignments", tags=["assignments"])

@router.get("/")
async def list_assignments():
    """Stub endpoint for assignments."""
    return {"message": "Assignments endpoint stub"}