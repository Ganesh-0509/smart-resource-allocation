import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.supabase_client import test_connection
from app.routes import analytics, assignments, audit, auth, batch_matching, intake, ocr, scheduling, tasks, volunteers
from app.routes import admin

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

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app.include_router(auth.router)
app.include_router(intake.router)
app.include_router(volunteers.router)
app.include_router(tasks.router)
app.include_router(assignments.router)
app.include_router(scheduling.router)
app.include_router(analytics.router)
app.include_router(audit.router)
app.include_router(batch_matching.router)
app.include_router(ocr.router)
app.include_router(admin.router)

# Serve static files from the 'static' directory
static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
if os.path.exists(static_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(static_path, "assets")), name="static")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    # API routes are handled by routers above.
    # Everything else serves the index.html
    index_file = os.path.join(static_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "API is running. Frontend not found.", "path": full_path}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
