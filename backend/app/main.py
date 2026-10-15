"""
Marga Backend — FastAPI application entry point.
Phase 0 skeleton: health check only. Services added in Phase 2.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Marga API",
    description="AI-Powered Road Condition Intelligence & Maintenance Prioritisation",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["system"])
async def health() -> dict:
    """Health check — used by the frontend to detect if the backend is alive."""
    return {"status": "ok", "version": "0.1.0", "demo_mode": True}
