"""
backend/app/services/ingest.py — Survey Ingestion & End-to-End Pipeline Worker

Orchestrates frame extraction, object detection, temporal tracking,
severity scoring, risk calculation, and database persistence for surveys.
"""

import os
import sys
import time
import math
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Callable, Optional
from sqlmodel import Session, select
from PIL import Image, ImageDraw

from backend.app.core.config import settings, THUMBNAILS_DIR
from backend.app.core.database import engine
from backend.app.models.schema import Survey, Frame, Detection as DbDetection, Defect, AuditLog
from backend.app.services.detector import get_detector
from backend.app.services.tracker import DefectTracker
from backend.app.services.severity import calculate_severity


def process_survey_job(
    survey_id: int,
    video_path: Optional[str] = None,
    gpx_path: Optional[str] = None,
    progress_callback: Optional[Callable[[int, int, str], None]] = None,
):
    """
    Background worker processing an ingested survey video or image sequence.
    """
    with Session(engine) as session:
        survey = session.get(Survey, survey_id)
        if not survey:
            print(f"[Ingest] Survey {survey_id} not found.")
            return

        survey.status = "processing"
        session.add(survey)
        session.commit()

        detector = get_detector()
        tracker = DefectTracker(iou_threshold=0.25, max_missed_frames=6)

        # Baseline geo coordinates near Perundurai NH-544 (11.2742°N, 77.5828°E)
        base_lat = 11.2742
        base_lon = 77.5828

        # Parse real GPX points if provided
        gpx_points = []
        if gpx_path and os.path.exists(gpx_path):
            try:
                import xml.etree.ElementTree as ET
                tree = ET.parse(gpx_path)
                for elem in tree.getroot().iter():
                    if elem.tag.endswith('trkpt') or elem.tag.endswith('wpt'):
                        g_lat = float(elem.attrib.get('lat', 0))
                        g_lon = float(elem.attrib.get('lon', 0))
                        g_ele = 280.0
                        for child in elem:
                            if child.tag.endswith('ele') and child.text:
                                try:
                                    g_ele = float(child.text)
                                except ValueError:
                                    pass
                        if g_lat != 0 and g_lon != 0:
                            gpx_points.append((g_lat, g_lon, g_ele))
                if gpx_points:
                    print(f"[Ingest] Loaded {len(gpx_points)} real GPS track points from {gpx_path}")
            except Exception as e:
                print(f"[Ingest] GPX parsing notice: {e}")

        total_frames = survey.total_frames or 30

        # Attempt to open real video file if provided
        cap = None
        frame_stride = 10
        if video_path and os.path.exists(video_path):
            try:
                import cv2
                cap = cv2.VideoCapture(video_path)
                if cap.isOpened():
                    vid_total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
                    if vid_total > 0:
                        total_frames = min(30, max(6, vid_total // 15))
                        frame_stride = max(1, vid_total // total_frames)
                        print(f"[Ingest] Opened real video '{video_path}' with {vid_total} frames. Sampling {total_frames} frames.")
            except Exception as e:
                print(f"[Ingest] Video capture fallback: {e}")
                cap = None

        survey.total_frames = total_frames

        print(f"[Ingest] Starting survey processing for ID={survey_id} ({total_frames} frames)...")

        for f_idx in range(total_frames):
            # Geo trajectory: use real GPX points if available, otherwise calibrated highway trajectory
            if gpx_points:
                p_idx = min(len(gpx_points) - 1, int((f_idx / max(1, total_frames - 1)) * (len(gpx_points) - 1)))
                lat, lon, elev = gpx_points[p_idx]
            else:
                dist_km = (f_idx * 0.015)  # 15m per sampled frame
                lat = base_lat + (dist_km / 111.0)
                lon = base_lon + (dist_km / 111.0) * 0.85
                elev = 280.0 + math.sin(f_idx * 0.2) * 4.0

            # Save real frame or generate synthetic frame for evidence storage
            frame_img_path = THUMBNAILS_DIR / f"survey_{survey_id}_frame_{f_idx}.jpg"
            saved_real_frame = False
            if cap and cap.isOpened():
                try:
                    import cv2
                    cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx * frame_stride)
                    ret, bgr = cap.read()
                    if ret and bgr is not None:
                        cv2.imwrite(str(frame_img_path), bgr)
                        saved_real_frame = True
                except Exception as ex:
                    print(f"[Ingest] Error extracting frame {f_idx}: {ex}")

            if not saved_real_frame and not frame_img_path.exists():
                img = Image.new("RGB", (1280, 720), color=(43, 45, 47))
                draw = ImageDraw.Draw(img)
                # Draw road lane markings
                draw.line([(640, 200), (400, 720)], fill=(242, 194, 48), width=4)
                draw.line([(640, 200), (880, 720)], fill=(242, 194, 48), width=4)
                # Center dashed line
                for y in range(250, 700, 60):
                    draw.line([(640, y), (640, y + 30)], fill=(236, 232, 221), width=3)
                img.save(frame_img_path, "JPEG")

            db_frame = Frame(
                survey_id=survey.id,
                frame_idx=f_idx,
                timestamp_sec=f_idx * 0.5,
                lat=lat,
                lon=lon,
                elevation=elev,
                image_path=str(frame_img_path),
            )
            session.add(db_frame)
            session.commit()
            session.refresh(db_frame)

            # Detect defects in frame
            detections = detector.detect(f"frame_{f_idx}", width=1280, height=720)

            for d in detections:
                db_det = DbDetection(
                    frame_id=db_frame.id,
                    track_id=None,
                    class_name=d.class_name,
                    confidence=d.confidence,
                    bbox_xmin=d.bbox[0],
                    bbox_ymin=d.bbox[1],
                    bbox_xmax=d.bbox[2],
                    bbox_ymax=d.bbox[3],
                    est_area_m2=d.estimated_area_m2,
                    is_waterlogged=d.is_waterlogged,
                    is_demo=d.is_demo,
                )
                session.add(db_det)

            # Update tracker
            tracker.update_frame(detections, f_idx, lat, lon)

            survey.processed_frames = f_idx + 1
            session.add(survey)
            session.commit()

            if progress_callback:
                progress_callback(f_idx + 1, total_frames, f"Processed frame {f_idx + 1}/{total_frames}")

            time.sleep(0.02)  # Yield for responsiveness

        if cap:
            try:
                cap.release()
            except Exception:
                pass

        # Finish tracking and consolidate
        final_tracks = tracker.finish()
        print(f"[Ingest] Consolidating {len(final_tracks)} defect tracks for Survey {survey_id}...")

        for track in final_tracks:
            sev_result = calculate_severity(
                class_name=track.consolidated_class,
                estimated_area_m2=track.max_area_m2,
                lane_position="wheel_path",
                is_waterlogged=track.is_waterlogged,
            )

            # Risk score R = 100 * (0.40*S' + 0.20*E + 0.15*V + 0.15*G + 0.10*T)
            # Default trunk road exposure = 0.8, vulnerability = 0.5, persistence = log(obs)
            s_norm = sev_result["score"] / 100.0
            exposure = 0.75
            vulnerability = 0.60
            persistence = min(1.0, track.observation_count / 8.0)
            risk = round(100.0 * (0.40 * s_norm + 0.20 * exposure + 0.15 * vulnerability + 0.15 * persistence + 0.10 * 0.5), 1)

            # Generate thumbnail crop
            thumb_path = THUMBNAILS_DIR / f"defect_thumb_survey_{survey_id}_t{track.track_id}.jpg"
            evidence_file = THUMBNAILS_DIR / f"survey_{survey_id}_frame_{track.first_seen_frame}.jpg"

            saved_crop = False
            if evidence_file.exists():
                try:
                    with Image.open(evidence_file) as ef:
                        ew, eh = ef.size
                        # Extract crop around road centre / lower region where defects appear
                        crop_x1 = max(0, int(ew * 0.25))
                        crop_y1 = max(0, int(eh * 0.35))
                        crop_x2 = min(ew, int(ew * 0.75))
                        crop_y2 = min(eh, int(eh * 0.85))
                        cropped = ef.crop((crop_x1, crop_y1, crop_x2, crop_y2)).resize((220, 220))
                        cropped.save(thumb_path, "JPEG")
                        saved_crop = True
                except Exception as ex:
                    print(f"[Ingest] Thumbnail crop error: {ex}")

            if not saved_crop and not thumb_path.exists():
                thumb_img = Image.new("RGB", (200, 200), color=(50, 52, 55))
                t_draw = ImageDraw.Draw(thumb_img)
                color = (179, 32, 42) if sev_result["band"] == "critical" else (217, 83, 30)
                t_draw.ellipse([40, 40, 160, 160], outline=color, width=4)
                t_draw.text((50, 90), track.consolidated_class[:12], fill=(236, 232, 221))
                thumb_img.save(thumb_path, "JPEG")

            explanation_text = (
                f"{sev_result['band'].title()} severity ({sev_result['score']}). "
                f"A {track.consolidated_class.replace('_', ' ')} with estimated surface area {track.max_area_m2:.2f} m² "
                f"in the primary wheel path. Observed across {track.observation_count} frames. "
                f"{'Standing water hazard detected.' if track.is_waterlogged else 'Dry conditions.'}"
            )

            db_defect = Defect(
                survey_id=survey.id,
                class_name=track.consolidated_class,
                severity_band=sev_result["band"],
                severity_score=sev_result["score"],
                risk_score=risk,
                lat=track.lat,
                lon=track.lon,
                est_area_m2=track.max_area_m2,
                observation_count=track.observation_count,
                first_seen_frame=track.first_seen_frame,
                last_seen_frame=track.last_seen_frame,
                status="detected",
                thumbnail_path=str(thumb_path),
                evidence_frame_path=str(THUMBNAILS_DIR / f"survey_{survey_id}_frame_{track.first_seen_frame}.jpg"),
                is_waterlogged=track.is_waterlogged,
                review_status="unreviewed",
                explanation=explanation_text,
            )
            session.add(db_defect)

        survey.status = "completed"
        survey.updated_at = datetime.now(timezone.utc)

        # Audit log entry
        audit = AuditLog(
            entity_type="survey",
            entity_id=survey.id,
            action="ingest_completed",
            actor="system_worker",
            details=f"Extracted {total_frames} frames, consolidated {len(final_tracks)} defect entities.",
        )
        session.add(audit)
        session.commit()

        print(f"[Ingest] Survey {survey_id} successfully completed!")
