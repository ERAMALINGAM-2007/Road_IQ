"""
backend/app/api/health.py — System Health & Evaluation Metrics Endpoints
"""

import json
from pathlib import Path
from fastapi import APIRouter
from backend.app.core.config import settings, MODELS_DIR

router = APIRouter(tags=["system"])


@router.get("/health")
async def health_check():
    """Returns system status, active database dialect, and demo mode flags."""
    return {
        "status": "ok",
        "service": "Marga API",
        "version": settings.VERSION,
        "demo_mode": settings.DEMO_MODE,
        "database": "sqlite_wal",
    }


@router.get("/model/metrics")
async def get_model_metrics():
    """Returns evaluation metrics from models/eval/metrics.json."""
    metrics_file = MODELS_DIR / "eval" / "metrics.json"
    if metrics_file.exists():
        with open(metrics_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "status": "pending",
        "model": "YOLO11n-RDD2022-India",
        "message": "Evaluation metrics not yet populated. Run ml/scripts/eval.py to compute.",
    }
