"""
backend/app/models/schema.py — SQLModel Database Models for Marga

Defines the complete persistence schema for surveys, video frames,
detections, consolidated defect entities, work orders, human reviews,
road segments, and the audit log.
"""

from typing import Optional, List
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Relationship


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Survey(SQLModel, table=True):
    __tablename__ = "surveys"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    road_name: str = Field(default="NH-544 / Perundurai Road", index=True)
    survey_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    status: str = Field(default="pending", index=True)  # pending, processing, completed, failed
    fps: float = Field(default=30.0)
    total_frames: int = Field(default=0)
    processed_frames: int = Field(default=0)
    video_path: Optional[str] = Field(default=None)
    gpx_path: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

    # Relationships
    frames: List["Frame"] = Relationship(back_populates="survey")
    defects: List["Defect"] = Relationship(back_populates="survey")


class Frame(SQLModel, table=True):
    __tablename__ = "frames"

    id: Optional[int] = Field(default=None, primary_key=True)
    survey_id: int = Field(foreign_key="surveys.id", index=True)
    frame_idx: int = Field(index=True)
    timestamp_sec: float = Field(default=0.0)
    lat: float = Field(default=11.2742)
    lon: float = Field(default=77.5828)
    elevation: float = Field(default=280.0)
    image_path: str

    survey: Optional[Survey] = Relationship(back_populates="frames")
    detections: List["Detection"] = Relationship(back_populates="frame")


class Detection(SQLModel, table=True):
    __tablename__ = "detections"

    id: Optional[int] = Field(default=None, primary_key=True)
    frame_id: int = Field(foreign_key="frames.id", index=True)
    track_id: Optional[int] = Field(default=None, index=True)
    class_name: str = Field(index=True)
    confidence: float
    bbox_xmin: float
    bbox_ymin: float
    bbox_xmax: float
    bbox_ymax: float
    est_area_m2: float = Field(default=0.10)
    is_waterlogged: bool = Field(default=False)
    is_demo: bool = Field(default=True)

    frame: Optional[Frame] = Relationship(back_populates="detections")


class Defect(SQLModel, table=True):
    __tablename__ = "defects"

    id: Optional[int] = Field(default=None, primary_key=True)
    survey_id: int = Field(foreign_key="surveys.id", index=True)
    class_name: str = Field(index=True)
    severity_band: str = Field(index=True)  # low, medium, high, critical
    severity_score: float = Field(index=True)  # 0.0 to 100.0
    risk_score: float = Field(default=50.0, index=True)  # 0.0 to 100.0
    lat: float = Field(default=11.2742, index=True)
    lon: float = Field(default=77.5828, index=True)
    est_area_m2: float = Field(default=0.15)
    observation_count: int = Field(default=1)
    first_seen_frame: int = Field(default=0)
    last_seen_frame: int = Field(default=0)
    status: str = Field(default="detected", index=True)  # detected, verified, scheduled, in_progress, repaired, rejected
    thumbnail_path: Optional[str] = Field(default=None)
    evidence_frame_path: Optional[str] = Field(default=None)
    is_waterlogged: bool = Field(default=False)
    review_status: str = Field(default="unreviewed")  # unreviewed, approved, rejected, reclassified
    explanation: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=utc_now)

    survey: Optional[Survey] = Relationship(back_populates="defects")
    work_orders: List["WorkOrder"] = Relationship(back_populates="defect")
    reviews: List["Review"] = Relationship(back_populates="defect")


class WorkOrder(SQLModel, table=True):
    __tablename__ = "work_orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    defect_id: int = Field(foreign_key="defects.id", index=True)
    status: str = Field(default="scheduled", index=True)  # scheduled, in_progress, completed, cancelled
    priority: str = Field(default="high")  # low, medium, high, urgent
    repair_method: str = Field(default="Cold Mix Asphalt Patching")
    estimated_cost_inr: float = Field(default=2400.0)
    scheduled_date: Optional[str] = Field(default=None)
    assigned_crew: Optional[str] = Field(default="Crew Alpha (Perundurai)")
    notes: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=utc_now)

    defect: Optional[Defect] = Relationship(back_populates="work_orders")


class Review(SQLModel, table=True):
    __tablename__ = "reviews"

    id: Optional[int] = Field(default=None, primary_key=True)
    defect_id: int = Field(foreign_key="defects.id", index=True)
    reviewer_role: str = Field(default="engineer")  # inspector, engineer, admin
    action: str = Field(index=True)  # approve, reject, reclassify
    previous_class: str
    new_class: str
    comment: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=utc_now)

    defect: Optional[Defect] = Relationship(back_populates="reviews")


class Segment(SQLModel, table=True):
    __tablename__ = "segments"

    id: Optional[int] = Field(default=None, primary_key=True)
    osm_way_id: Optional[str] = Field(default=None, index=True)
    road_name: str = Field(default="NH-544 Salem-Kochi Highway", index=True)
    highway_class: str = Field(default="trunk", index=True)  # trunk, primary, secondary, tertiary, residential
    length_m: float = Field(default=500.0)
    speed_limit_kmh: int = Field(default=60)
    rhi_score: float = Field(default=82.0)  # 0 to 100
    rhi_grade: str = Field(default="B")     # A, B, C, D, F
    defect_count: int = Field(default=0)
    geometry_geojson: Optional[str] = Field(default=None)


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_log"

    id: Optional[int] = Field(default=None, primary_key=True)
    entity_type: str = Field(index=True)  # defect, work_order, survey
    entity_id: int = Field(index=True)
    action: str = Field(index=True)
    actor: str = Field(default="system")
    details: Optional[str] = Field(default=None)
    timestamp: datetime = Field(default_factory=utc_now)
