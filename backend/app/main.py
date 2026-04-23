import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.supabase_client import test_connection
from app.routers import analytics, assignments, batch_matching, ocr, scheduling, tasks, volunteers

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Starting up Smart Resource Allocation API...")
    if test_connection():
        logger.info("Supabase connection verified during startup.")
    else:
        logger.error("Supabase connection failed during startup.")
    yield
    # Shutdown actions
    logger.info("Shutting down API...")

app = FastAPI(
    title="Smart Resource Allocation API",
    description="NGO volunteer coordination system for India",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://*.vercel.app",
        "https://your-vercel-url.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(volunteers.router)
app.include_router(tasks.router)
app.include_router(assignments.router)
app.include_router(scheduling.router)
app.include_router(analytics.router)
app.include_router(batch_matching.router)
app.include_router(ocr.router)

@app.get("/")
def health():
    return {"status": "ok", "version": "1.0"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
