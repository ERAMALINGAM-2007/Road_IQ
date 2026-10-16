"""
scripts/bake_static_demo.py — Export Database to Static Demo JSON Safety Net

Queries Marga's SQLite database and exports full JSON snapshots to
frontend/public/demo-data/*.json.

When VITE_STATIC_DEMO=1 is enabled, the frontend runs completely in-browser
without requiring a backend server or database connection.

Usage:
    python scripts/bake_static_demo.py
"""

import sys
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlmodel import Session, select
from backend.app.core.database import engine
from backend.app.models.schema import Survey, Defect, Segment, WorkOrder, CitizenReport
from backend.app.core.config import settings, MODELS_DIR

DEMO_DATA_DIR = PROJECT_ROOT / "frontend" / "public" / "demo-data"
DEMO_DATA_DIR.mkdir(parents=True, exist_ok=True)


def bake_static_data():
    print(f"[bake_static_demo] Exporting database snapshots to {DEMO_DATA_DIR}...")

    with Session(engine) as session:
        # 1. Surveys
        surveys = session.exec(select(Survey).order_by(Survey.id.desc())).all()
        surveys_payload = [
            {
                "id": s.id,
                "name": s.name,
                "road_name": s.road_name,
                "survey_date": s.survey_date,
                "status": s.status,
                "total_frames": s.total_frames,
                "processed_frames": s.processed_frames,
            }
            for s in surveys
        ]
        with open(DEMO_DATA_DIR / "surveys.json", "w", encoding="utf-8") as f:
            json.dump(surveys_payload, f, indent=2)

        # 2. Defects
        defects = session.exec(select(Defect).order_by(Defect.risk_score.desc())).all()
        defects_payload = [
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
                "thumbnail_url": f"/demo-data/thumbnails/{Path(d.thumbnail_path).name}" if d.thumbnail_path else None,
                "explanation": d.explanation,
                "created_at": d.created_at.isoformat() if hasattr(d.created_at, "isoformat") else str(d.created_at),
            }
            for d in defects
        ]
        with open(DEMO_DATA_DIR / "defects.json", "w", encoding="utf-8") as f:
            json.dump(defects_payload, f, indent=2)

        # 3. Segments
        segments = session.exec(select(Segment)).all()
        segments_payload = [
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
        with open(DEMO_DATA_DIR / "segments.json", "w", encoding="utf-8") as f:
            json.dump(segments_payload, f, indent=2)

        # 4. Model metrics
        metrics_file = MODELS_DIR / "eval" / "metrics.json"
        if metrics_file.exists():
            with open(metrics_file, "r", encoding="utf-8") as f:
                metrics_data = json.load(f)
            with open(DEMO_DATA_DIR / "metrics.json", "w", encoding="utf-8") as f:
                json.dump(metrics_data, f, indent=2)

        # 5. Work Orders
        work_orders = session.exec(select(WorkOrder)).all()
        if work_orders:
            work_orders_payload = [
                {
                    "id": wo.id,
                    "defect_id": wo.defect_id,
                    "status": wo.status,
                    "priority": wo.priority,
                    "repair_method": wo.repair_method,
                    "estimated_cost_inr": wo.estimated_cost_inr,
                    "scheduled_date": wo.scheduled_date,
                    "assigned_crew": wo.assigned_crew,
                    "notes": wo.notes,
                }
                for wo in work_orders
            ]
            with open(DEMO_DATA_DIR / "work-orders.json", "w", encoding="utf-8") as f:
                json.dump(work_orders_payload, f, indent=2)

        # 6. Citizen Reports
        citizen_reports = session.exec(select(CitizenReport)).all()
        citizen_payload = [
            {
                "id": cr.id,
                "ticket_id": cr.ticket_id,
                "reporter_name": cr.reporter_name,
                "category": cr.category,
                "severity": cr.severity,
                "description": cr.description,
                "landmark": cr.landmark,
                "lat": cr.lat,
                "lon": cr.lon,
                "status": cr.status,
                "created_at": cr.created_at.isoformat() if hasattr(cr.created_at, "isoformat") else str(cr.created_at),
            }
            for cr in citizen_reports
        ]
        with open(DEMO_DATA_DIR / "citizen-reports.json", "w", encoding="utf-8") as f:
            json.dump(citizen_payload, f, indent=2)

        # 7. Config
        with open(DEMO_DATA_DIR / "scoring.json", "w", encoding="utf-8") as f:
            json.dump(settings.SCORING, f, indent=2)

    print(f"[bake_static_demo] Successfully exported: surveys ({len(surveys_payload)}), defects ({len(defects_payload)}), segments ({len(segments_payload)}), citizen_reports ({len(citizen_payload)})")


if __name__ == '__main__':
    bake_static_data()
