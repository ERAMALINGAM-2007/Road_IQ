"""
backend/app/api/export.py — Export Endpoints (CSV & GeoJSON) for Defect Data
"""

import io
import csv
import json
from typing import Optional
from fastapi import APIRouter, Depends, Response
from sqlmodel import Session, select

from backend.app.core.database import get_session
from backend.app.models.schema import Defect, Survey

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/csv")
def export_defects_csv(
    survey_id: Optional[int] = None,
    session: Session = Depends(get_session),
):
    """
    Exports road defects as a CSV spreadsheet.
    """
    stmt = select(Defect)
    if survey_id:
        stmt = stmt.where(Defect.survey_id == survey_id)
    defects = session.exec(stmt).all()

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header row
    writer.writerow([
        "id",
        "survey_id",
        "class_name",
        "severity_band",
        "severity_score",
        "risk_score",
        "latitude",
        "longitude",
        "est_area_m2",
        "observation_count",
        "status",
        "review_status",
        "is_waterlogged",
        "created_at",
    ])

    for d in defects:
        writer.writerow([
            d.id,
            d.survey_id,
            d.class_name,
            d.severity_band,
            f"{d.severity_score:.1f}",
            f"{d.risk_score:.1f}",
            f"{d.lat:.6f}",
            f"{d.lon:.6f}",
            f"{d.est_area_m2:.3f}",
            d.observation_count,
            d.status,
            d.review_status,
            "true" if d.is_waterlogged else "false",
            d.created_at.isoformat() if hasattr(d.created_at, "isoformat") else str(d.created_at),
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=marga_defects_export.csv"},
    )


@router.get("/geojson")
def export_defects_geojson(
    survey_id: Optional[int] = None,
    session: Session = Depends(get_session),
):
    """
    Exports road defects as an RFC 7946 GeoJSON FeatureCollection.
    """
    stmt = select(Defect)
    if survey_id:
        stmt = stmt.where(Defect.survey_id == survey_id)
    defects = session.exec(stmt).all()

    features = []
    for d in defects:
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [round(d.lon, 6), round(d.lat, 6)],
            },
            "properties": {
                "id": d.id,
                "survey_id": d.survey_id,
                "class_name": d.class_name,
                "severity_band": d.severity_band,
                "severity_score": round(d.severity_score, 1),
                "risk_score": round(d.risk_score, 1),
                "est_area_m2": round(d.est_area_m2, 3),
                "status": d.status,
                "review_status": d.review_status,
                "is_waterlogged": d.is_waterlogged,
                "created_at": d.created_at.isoformat() if hasattr(d.created_at, "isoformat") else str(d.created_at),
            },
        }
        features.append(feature)

    geojson_doc = {
        "type": "FeatureCollection",
        "name": "Marga Road Defect Survey",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"},
        },
        "features": features,
    }

    return Response(
        content=json.dumps(geojson_doc, indent=2),
        media_type="application/geo+json",
        headers={"Content-Disposition": "attachment; filename=marga_defects.geojson"},
    )
