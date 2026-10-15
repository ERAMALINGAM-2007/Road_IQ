"""
backend/app/api/segments.py — Road Segment & Road Health Index (RHI) Endpoints
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from backend.app.core.database import get_session
from backend.app.models.schema import Segment, Defect

router = APIRouter(prefix="/segments", tags=["segments"])


@router.get("")
async def list_segments(session: Session = Depends(get_session)):
    """
    List road segments with Road Health Index (RHI) scores, defect density, and ratings.
    """
    segments = session.exec(select(Segment)).all()
    if not segments:
        # Seed baseline corridor segments for Perundurai
        baseline_segments = [
            Segment(
                osm_way_id="way/10492831",
                road_name="NH-544 Salem-Kochi Highway (Km 42-43)",
                highway_class="trunk",
                length_m=1000.0,
                speed_limit_kmh=80,
                rhi_score=86.5,
                rhi_grade="A",
                defect_count=2,
            ),
            Segment(
                osm_way_id="way/10492832",
                road_name="NH-544 Salem-Kochi Highway (Km 43-44)",
                highway_class="trunk",
                length_m=1000.0,
                speed_limit_kmh=80,
                rhi_score=68.0,
                rhi_grade="C",
                defect_count=7,
            ),
            Segment(
                osm_way_id="way/20839102",
                road_name="SH-96 Perundurai - Erode Road",
                highway_class="primary",
                length_m=1200.0,
                speed_limit_kmh=60,
                rhi_score=54.2,
                rhi_grade="D",
                defect_count=14,
            ),
            Segment(
                osm_way_id="way/30918274",
                road_name="KEC Campus Access Boulevard",
                highway_class="secondary",
                length_m=800.0,
                speed_limit_kmh=40,
                rhi_score=92.0,
                rhi_grade="A",
                defect_count=1,
            ),
        ]
        for s in baseline_segments:
            session.add(s)
        session.commit()
        segments = session.exec(select(Segment)).all()

    return [
        {
            "id": s.id,
            "osm_way_id": s.osm_way_id,
            "road_name": s.road_name,
            "highway_class": s.highway_class,
            "length_m": s.length_m,
            "speed_limit_kmh": s.speed_limit_kmh,
            "rhi_score": s.rhi_score,
            "rhi_grade": s.rhi_grade,
            "defect_count": s.defect_count,
        }
        for s in segments
    ]
