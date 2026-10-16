"""
backend/app/api/citizen.py — Citizen Hazard Reporting API
"""

import random
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from backend.app.core.database import get_session
from backend.app.models.schema import CitizenReport

router = APIRouter(prefix="/citizen", tags=["citizen"])


class CitizenReportCreate(BaseModel):
    category: str = Field(default="pothole", description="pothole, crack, waterlogging, debris, other")
    severity: str = Field(default="moderate", description="minor, moderate, dangerous")
    description: Optional[str] = None
    landmark: Optional[str] = None
    lat: float = 11.2742
    lon: float = 77.5828
    reporter_name: Optional[str] = "Anonymous Citizen"
    reporter_phone: Optional[str] = None
    image_url: Optional[str] = None


class CitizenReportOut(BaseModel):
    id: int
    ticket_id: str
    category: str
    severity: str
    description: Optional[str]
    landmark: Optional[str]
    lat: float
    lon: float
    reporter_name: Optional[str]
    status: str
    created_at: datetime


@router.post("/reports", response_model=CitizenReportOut, status_code=201)
def submit_citizen_report(
    report_in: CitizenReportCreate,
    session: Session = Depends(get_session),
):
    """
    Submits a new citizen hazard report and returns a unique tracking ticket.
    """
    ticket_id = f"MGA-CIT-{random.randint(1000, 9999)}"
    
    # Ensure uniqueness
    while session.exec(select(CitizenReport).where(CitizenReport.ticket_id == ticket_id)).first():
        ticket_id = f"MGA-CIT-{random.randint(1000, 9999)}"

    db_report = CitizenReport(
        ticket_id=ticket_id,
        category=report_in.category,
        severity=report_in.severity,
        description=report_in.description,
        landmark=report_in.landmark,
        lat=report_in.lat,
        lon=report_in.lon,
        reporter_name=report_in.reporter_name or "Anonymous Citizen",
        reporter_phone=report_in.reporter_phone,
        image_url=report_in.image_url,
        status="received",
        created_at=datetime.now(timezone.utc),
    )
    session.add(db_report)
    session.commit()
    session.refresh(db_report)
    return db_report


@router.get("/reports", response_model=List[CitizenReportOut])
def list_citizen_reports(
    limit: int = Query(default=20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    """
    Lists recent citizen hazard reports for the community feed.
    """
    statement = select(CitizenReport).order_by(CitizenReport.created_at.desc()).limit(limit)
    return session.exec(statement).all()


@router.get("/reports/{ticket_id}", response_model=CitizenReportOut)
def get_report_by_ticket(
    ticket_id: str,
    session: Session = Depends(get_session),
):
    """
    Looks up a citizen report by ticket ID for status tracking.
    """
    report = session.exec(
        select(CitizenReport).where(CitizenReport.ticket_id == ticket_id.upper())
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return report
