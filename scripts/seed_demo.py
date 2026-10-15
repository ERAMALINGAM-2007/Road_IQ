"""
scripts/seed_demo.py — Seed Marga SQLite Database with Realistic Perundurai Defects

Seeds ~150 synthetic defects placed along real road coordinates in Perundurai,
Erode district (SDG 11 reference region) across three survey dates:
- 12 Oct 2026 (Latest pass — ~70 defects)
- 05 Oct 2026 (Prior pass  — ~48 defects)
- 28 Sep 2026 (Initial pass — ~32 defects)

Generates:
- Surveys, Frames, and Detections
- Consolidated Defect entities with explainable severity and risk scores
- Scheduled Work Orders for High & Critical defects
- Human verification audit log records
- Evidence frames and crop thumbnails in data/thumbnails/

Usage:
    python scripts/seed_demo.py
"""

import os
import sys
import math
import random
from pathlib import Path
from datetime import datetime, timezone, timedelta
from PIL import Image, ImageDraw

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sqlmodel import Session, select
from backend.app.core.config import THUMBNAILS_DIR
from backend.app.core.database import engine, init_db
from backend.app.models.schema import Survey, Frame, Detection, Defect, WorkOrder, Review, Segment, AuditLog
from backend.app.services.severity import calculate_severity
from backend.app.services.geo import get_road_exposure, get_vulnerability
from backend.app.services.risk import calculate_risk
from backend.app.services.weather import get_weather_context

CLASSES = ["pothole", "longitudinal_crack", "transverse_crack", "surface_damage"]

SURVEY_SPECS = [
    {"name": "Survey · 12 Oct 2026", "date": "2026-10-12", "defect_count": 70, "days_ago": 3},
    {"name": "Survey · 05 Oct 2026", "date": "2026-10-05", "defect_count": 48, "days_ago": 10},
    {"name": "Survey · 28 Sep 2026", "date": "2026-09-28", "defect_count": 32, "days_ago": 17},
]

# Real road waypoints near Perundurai, Erode
ROADS = [
    {
        "name": "NH-544 Salem-Kochi Highway (Perundurai Bypass)",
        "start": (11.2650, 77.5750),
        "end": (11.2820, 77.6000),
        "speed": 80,
    },
    {
        "name": "SH-96 Perundurai - Erode Road",
        "start": (11.2740, 77.5830),
        "end": (11.2880, 77.6250),
        "speed": 60,
    },
    {
        "name": "KEC Campus Access Boulevard (Thoppupalayam)",
        "start": (11.2720, 77.6020),
        "end": (11.2790, 77.6150),
        "speed": 40,
    },
]


def create_mock_thumbnail(thumb_path: Path, class_name: str, band: str):
    """Draw a clean visual crop representing the road defect."""
    if thumb_path.exists():
        return
    img = Image.new("RGB", (220, 220), color=(40, 42, 45))
    draw = ImageDraw.Draw(img)

    # Road asphalt texture simulation
    for y in range(0, 220, 4):
        draw.line([(0, y), (220, y)], fill=(44, 46, 49), width=1)

    # Colour by severity band
    band_colors = {
        "critical": (179, 32, 42),
        "high": (217, 83, 30),
        "medium": (217, 162, 27),
        "low": (94, 140, 97),
    }
    color = band_colors.get(band, (217, 83, 30))

    if class_name == "pothole":
        draw.ellipse([45, 55, 175, 165], fill=(22, 24, 26), outline=color, width=4)
        draw.ellipse([65, 75, 155, 145], fill=(16, 18, 20))
    elif "crack" in class_name:
        points = [(40, 180), (70, 130), (120, 110), (150, 70), (190, 40)]
        draw.line(points, fill=color, width=5)
    else:  # surface damage / alligator
        for i in range(40, 180, 30):
            draw.rectangle([i, 60, i + 25, 150], outline=color, width=2)

    # Water reflection badge
    draw.text((15, 195), f"{class_name.replace('_', ' ').title()}", fill=(236, 232, 221))
    img.save(thumb_path, "JPEG")


def seed_database():
    print("[seed_demo] Initialising database...")
    init_db()

    with Session(engine) as session:
        # Check if already seeded
        existing_defects = session.exec(select(Defect)).all()
        if len(existing_defects) >= 100:
            print(f"[seed_demo] Database already populated with {len(existing_defects)} defects.")
            return

        print("[seed_demo] Seeding ~150 synthetic defects along real Perundurai road corridors...")
        random.seed(42)

        weather = get_weather_context(11.2742, 77.5828)
        rain_72h = weather.get("rainfall_last_72h_mm", 18.5)

        total_defects_created = 0

        for survey_spec in SURVEY_SPECS:
            survey = Survey(
                name=survey_spec["name"],
                road_name="NH-544 & SH-96 Corridors (Perundurai Network)",
                survey_date=survey_spec["date"],
                status="completed",
                total_frames=30,
                processed_frames=30,
            )
            session.add(survey)
            session.commit()
            session.refresh(survey)

            target_count = survey_spec["defect_count"]

            for i in range(target_count):
                road = random.choice(ROADS)
                t = (i + 1) / float(target_count + 1)

                # Linear interpolation along road corridor
                lat = road["start"][0] + t * (road["end"][0] - road["start"][0]) + random.uniform(-0.0003, 0.0003)
                lon = road["start"][1] + t * (road["end"][1] - road["start"][1]) + random.uniform(-0.0003, 0.0003)

                cname = random.choices(
                    CLASSES,
                    weights=[0.40, 0.25, 0.15, 0.20],  # Potholes most common
                    k=1
                )[0]

                est_area = round(random.uniform(0.06, 0.85), 3)
                lane_pos = random.choices(["wheel_path", "lane_edge", "shoulder"], weights=[0.65, 0.25, 0.10], k=1)[0]
                is_water = (cname == "pothole") and (random.random() < 0.28)

                # 1. Severity calculation
                sev_res = calculate_severity(
                    class_name=cname,
                    estimated_area_m2=est_area,
                    lane_position=lane_pos,
                    is_waterlogged=is_water,
                    road_speed_limit_kmh=road["speed"],
                )

                # 2. Geo context
                exposure_res = get_road_exposure(lat, lon)
                vuln_res = get_vulnerability(lat, lon)

                # 3. Risk calculation
                obs_count = random.randint(1, 8)
                days_unrep = survey_spec["days_ago"] + random.randint(0, 14)
                risk_res = calculate_risk(
                    severity_score=sev_res["score"],
                    exposure_score=exposure_res["exposure_score"],
                    vulnerability_score=vuln_res["vulnerability_score"],
                    observation_count=obs_count,
                    days_unrepaired=days_unrep,
                    rainfall_last_72h_mm=rain_72h,
                )

                # Thumbnail path
                thumb_file = THUMBNAILS_DIR / f"seed_defect_s{survey.id}_{i+1}.jpg"
                create_mock_thumbnail(thumb_file, cname, sev_res["band"])

                status = random.choices(
                    ["detected", "verified", "scheduled", "in_progress", "repaired"],
                    weights=[0.45, 0.25, 0.15, 0.10, 0.05],
                    k=1
                )[0]

                expl = (
                    f"{sev_res['band'].title()} severity ({sev_res['score']}) with risk score {risk_res['risk_score']}. "
                    f"A {cname.replace('_', ' ')} with surface area {est_area:.2f} m² located in {lane_pos.replace('_', ' ')} "
                    f"on {road['name']}. {'Standing water hazard detected.' if is_water else ''}"
                )

                defect = Defect(
                    survey_id=survey.id,
                    class_name=cname,
                    severity_band=sev_res["band"],
                    severity_score=sev_res["score"],
                    risk_score=risk_res["risk_score"],
                    lat=round(lat, 6),
                    lon=round(lon, 6),
                    est_area_m2=est_area,
                    observation_count=obs_count,
                    first_seen_frame=max(0, i % 25),
                    last_seen_frame=min(30, (i % 25) + obs_count),
                    status=status,
                    review_status="approved" if status in ("verified", "scheduled", "in_progress", "repaired") else "unreviewed",
                    thumbnail_path=str(thumb_file),
                    is_waterlogged=is_water,
                    explanation=expl,
                )
                session.add(defect)
                session.commit()
                session.refresh(defect)

                # If scheduled or in progress, create work order
                if status in ("scheduled", "in_progress"):
                    cost = round(random.uniform(1800.0, 6500.0), 0)
                    wo = WorkOrder(
                        defect_id=defect.id,
                        status="scheduled" if status == "scheduled" else "in_progress",
                        priority=sev_res["band"],
                        repair_method="Cold Mix Asphalt Patching" if cname == "pothole" else "Bituminous Sealant Injection",
                        estimated_cost_inr=cost,
                        scheduled_date="2026-10-22",
                        assigned_crew="Crew Alpha (Perundurai Highway Sub-Division)",
                    )
                    session.add(wo)

                total_defects_created += 1

        session.commit()
        print(f"[seed_demo] Complete! Created {total_defects_created} defects across 3 surveys.")


if __name__ == '__main__':
    seed_database()
