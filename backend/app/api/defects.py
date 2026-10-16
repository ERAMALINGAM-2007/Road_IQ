"""
backend/app/api/defects.py — Defect Query, Detail, and Human Review Endpoints
"""

from typing import List, Optional
from pathlib import Path
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlmodel import Session, select

from backend.app.core.database import get_session
from backend.app.models.schema import Defect, Review, AuditLog
from backend.app.services.severity import calculate_severity

router = APIRouter(prefix="/defects", tags=["defects"])


class ReviewRequest(BaseModel):
    action: str  # approve, reject, reclassify
    new_class: Optional[str] = None
    comment: Optional[str] = None
    reviewer_role: str = "engineer"


@router.get("")
async def list_defects(
    survey_id: Optional[int] = Query(None),
    severity: Optional[str] = Query(None),
    class_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    min_risk: Optional[float] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
):
    """
    Query defects with multi-attribute filtering, sorting, and pagination.
    """
    stmt = select(Defect)
    if survey_id is not None:
        stmt = stmt.where(Defect.survey_id == survey_id)
    if severity:
        stmt = stmt.where(Defect.severity_band == severity.lower())
    if class_name:
        stmt = stmt.where(Defect.class_name == class_name.lower())
    if status:
        stmt = stmt.where(Defect.status == status.lower())
    if min_risk is not None:
        stmt = stmt.where(Defect.risk_score >= min_risk)

    stmt = stmt.order_by(Defect.risk_score.desc()).offset(offset).limit(limit)
    defects = session.exec(stmt).all()

    return [
        {
            "id": d.id,
            "survey_id": d.survey_id,
            "class_name": d.class_name,
            "severity_band": d.severity_band,
            "severity_score": d.severity_score,
            "risk_score": d.risk_score,
            "lat": d.lat,
            "lon": d.lon,
            "est_area_m2": d.est_area_m2,
            "observation_count": d.observation_count,
            "status": d.status,
            "review_status": d.review_status,
            "is_waterlogged": d.is_waterlogged,
            "thumbnail_url": f"/api/static/thumbnails/{Path(d.thumbnail_path).name}" if d.thumbnail_path else None,
            "explanation": d.explanation,
            "created_at": d.created_at,
        }
        for d in defects
    ]


@router.get("/{defect_id}")
async def get_defect(defect_id: int, session: Session = Depends(get_session)):
    """
    Retrieve single defect details with explainable scoring breakdown.
    """
    defect = session.get(Defect, defect_id)
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    # Recompute live breakdown for UI explainability waterfall
    sev_calc = calculate_severity(
        class_name=defect.class_name,
        estimated_area_m2=defect.est_area_m2,
        lane_position="wheel_path",
        is_waterlogged=defect.is_waterlogged,
    )

    return {
        "id": defect.id,
        "survey_id": defect.survey_id,
        "class_name": defect.class_name,
        "severity_band": defect.severity_band,
        "severity_score": defect.severity_score,
        "risk_score": defect.risk_score,
        "lat": defect.lat,
        "lon": defect.lon,
        "est_area_m2": defect.est_area_m2,
        "observation_count": defect.observation_count,
        "first_seen_frame": defect.first_seen_frame,
        "last_seen_frame": defect.last_seen_frame,
        "status": defect.status,
        "review_status": defect.review_status,
        "is_waterlogged": defect.is_waterlogged,
        "thumbnail_url": f"/api/static/thumbnails/{Path(defect.thumbnail_path).name}" if defect.thumbnail_path else None,
        "explanation": defect.explanation,
        "breakdown": sev_calc["breakdown"],
        "overrides": sev_calc["overrides"],
        "created_at": defect.created_at,
    }


@router.post("/{defect_id}/review")
async def review_defect(
    defect_id: int,
    payload: ReviewRequest,
    session: Session = Depends(get_session),
):
    """
    Human verification endpoint: Approve, Reject, or Reclassify a detected defect.
    Creates an immutable audit log entry.
    """
    defect = session.get(Defect, defect_id)
    if not defect:
        raise HTTPException(status_code=404, detail="Defect not found")

    prev_class = defect.class_name
    action = payload.action.lower()

    if action == "approve":
        defect.status = "verified"
        defect.review_status = "approved"
    elif action == "reject":
        defect.status = "rejected"
        defect.review_status = "rejected"
    elif action == "reclassify":
        if not payload.new_class:
            raise HTTPException(status_code=400, detail="new_class is required when action is reclassify")
        defect.class_name = payload.new_class.lower()
        defect.review_status = "reclassified"
        # Recompute severity score under new class
        sev = calculate_severity(
            class_name=defect.class_name,
            estimated_area_m2=defect.est_area_m2,
            is_waterlogged=defect.is_waterlogged,
        )
        defect.severity_score = sev["score"]
        defect.severity_band = sev["band"]
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {payload.action}")

    # Record review audit
    review_record = Review(
        defect_id=defect.id,
        reviewer_role=payload.reviewer_role,
        action=action,
        previous_class=prev_class,
        new_class=defect.class_name,
        comment=payload.comment,
    )
    session.add(review_record)

    audit_entry = AuditLog(
        entity_type="defect",
        entity_id=defect.id,
        action=f"review_{action}",
        actor=payload.reviewer_role,
        details=f"Status: {defect.status}, Class: {prev_class} -> {defect.class_name}. Comment: {payload.comment or 'None'}",
    )
    session.add(audit_entry)
    session.add(defect)
    session.commit()
    session.refresh(defect)

    return {
        "id": defect.id,
        "status": defect.status,
        "review_status": defect.review_status,
        "class_name": defect.class_name,
        "severity_score": defect.severity_score,
        "severity_band": defect.severity_band,
        "message": f"Defect {action} recorded successfully.",
    }
