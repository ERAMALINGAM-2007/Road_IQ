"""
backend/app/api/surveys.py — Survey Ingestion & Real-Time Progress Endpoints
"""

import os
import shutil
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, WebSocket, WebSocketDisconnect, HTTPException
from sqlmodel import Session, select
from backend.app.core.database import get_session
from backend.app.core.config import UPLOADS_DIR
from backend.app.models.schema import Survey, Frame, Defect
from backend.app.services.ingest import process_survey_job

router = APIRouter(prefix="/surveys", tags=["surveys"])

# In-memory progress tracking for real-time WebSocket listeners
survey_progress_state = {}


def update_progress(survey_id: int, current: int, total: int, message: str):
    survey_progress_state[survey_id] = {
        "survey_id": survey_id,
        "processed_frames": current,
        "total_frames": total,
        "percent": round((current / max(1, total)) * 100, 1),
        "message": message,
    }


@router.post("", status_code=202)
async def create_survey(
    background_tasks: BackgroundTasks,
    road_name: str = Form("NH-544 Salem-Kochi Highway (Perundurai Bypass)"),
    video_file: Optional[UploadFile] = File(None),
    gpx_file: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
):
    """
    Ingest a new survey footage file (video or image collection) and optional GPX track.
    Kicks off background frame extraction, detection, tracking, and severity scoring.
    """
    saved_video_path = None
    if video_file:
        saved_video_path = str(UPLOADS_DIR / video_file.filename)
        with open(saved_video_path, "wb") as buffer:
            shutil.copyfileobj(video_file.file, buffer)

    saved_gpx_path = None
    if gpx_file:
        saved_gpx_path = str(UPLOADS_DIR / gpx_file.filename)
        with open(saved_gpx_path, "wb") as buffer:
            shutil.copyfileobj(gpx_file.file, buffer)

    survey = Survey(
        name=f"Survey {road_name.split()[0]}",
        road_name=road_name,
        status="processing",
        total_frames=24,  # Standard sample run
        video_path=saved_video_path,
        gpx_path=saved_gpx_path,
    )
    session.add(survey)
    session.commit()
    session.refresh(survey)

    survey_progress_state[survey.id] = {
        "survey_id": survey.id,
        "processed_frames": 0,
        "total_frames": survey.total_frames,
        "percent": 0.0,
        "message": "Queued for frame extraction",
    }

    # Dispatch worker to background task
    background_tasks.add_task(
        process_survey_job,
        survey_id=survey.id,
        video_path=saved_video_path,
        gpx_path=saved_gpx_path,
        progress_callback=lambda curr, tot, msg: update_progress(survey.id, curr, tot, msg),
    )

    return {
        "id": survey.id,
        "name": survey.name,
        "road_name": survey.road_name,
        "status": survey.status,
        "message": "Survey ingestion scheduled. Stream progress via /api/surveys/{id}/progress",
    }


@router.get("")
async def list_surveys(session: Session = Depends(get_session)):
    """List all surveys with summary statistics."""
    surveys = session.exec(select(Survey).order_by(Survey.id.desc())).all()
    results = []
    for s in surveys:
        defect_count = session.exec(select(Defect).where(Defect.survey_id == s.id)).all()
        results.append({
            "id": s.id,
            "name": s.name,
            "road_name": s.road_name,
            "survey_date": s.survey_date,
            "status": s.status,
            "total_frames": s.total_frames,
            "processed_frames": s.processed_frames,
            "defect_count": len(defect_count),
            "created_at": s.created_at,
        })
    return results


@router.get("/{survey_id}")
async def get_survey(survey_id: int, session: Session = Depends(get_session)):
    """Retrieve detailed metadata for a single survey."""
    survey = session.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    defects = session.exec(select(Defect).where(Defect.survey_id == survey_id)).all()
    return {
        "id": survey.id,
        "name": survey.name,
        "road_name": survey.road_name,
        "survey_date": survey.survey_date,
        "status": survey.status,
        "total_frames": survey.total_frames,
        "processed_frames": survey.processed_frames,
        "defect_count": len(defects),
        "created_at": survey.created_at,
    }


@router.websocket("/{survey_id}/progress")
async def websocket_survey_progress(websocket: WebSocket, survey_id: int):
    """
    WebSocket endpoint streaming live frame-by-frame progress updates.
    """
    await websocket.accept()
    try:
        while True:
            state = survey_progress_state.get(survey_id, {
                "survey_id": survey_id,
                "processed_frames": 0,
                "total_frames": 1,
                "percent": 0.0,
                "message": "Waiting...",
            })
            await websocket.send_json(state)
            if state.get("percent", 0.0) >= 100.0:
                await websocket.send_json({"status": "completed", "message": "Processing finished!"})
                break
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass
