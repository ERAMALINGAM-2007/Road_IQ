"""
backend/app/main.py — FastAPI Application Entry Point for Marga
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings, THUMBNAILS_DIR
from backend.app.core.database import init_db
from backend.app.api import health, surveys, defects, segments


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure SQLite database tables are created
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Road Condition Intelligence & Maintenance Prioritisation System",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static asset directory for thumbnails and evidence frames
app.mount("/api/static/thumbnails", StaticFiles(directory=str(THUMBNAILS_DIR)), name="thumbnails")

# Register API routers
app.include_router(health.router, prefix="/api")
app.include_router(surveys.router, prefix="/api")
app.include_router(defects.router, prefix="/api")
app.include_router(segments.router, prefix="/api")


# Root redirect or greeting
@app.get("/", tags=["system"])
async def root():
    return {
        "service": "Marga Road Condition Intelligence API",
        "version": settings.VERSION,
        "docs": "/api/docs",
        "health": "/api/health",
    }
