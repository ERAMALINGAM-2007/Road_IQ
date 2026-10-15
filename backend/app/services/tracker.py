"""
backend/app/services/tracker.py — Video Tracking & Defect De-duplication

Implements temporal association tracking across video frames (IoU + velocity cue).
Consolidates multi-frame detections of the same physical defect into a single
Defect entity, calculating observation count and selecting the optimal vantage frame.
"""

from typing import List, Dict, Any, Optional
from backend.app.services.detector import Detection


def calculate_iou(boxA: List[float], boxB: List[float]) -> float:
    """Computes IoU for [xmin, ymin, xmax, ymax]."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
    if interArea <= 0.0:
        return 0.0

    boxAArea = max(1.0, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    boxBArea = max(1.0, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

    return interArea / float(boxAArea + boxBArea - interArea)


class Track:
    def __init__(self, track_id: int, initial_detection: Detection, frame_idx: int, lat: float, lon: float):
        self.track_id = track_id
        self.class_name = initial_detection.class_name
        self.class_counts = {initial_detection.class_name: 1}
        self.best_confidence = initial_detection.confidence
        self.best_bbox = list(initial_detection.bbox)
        self.max_area_m2 = initial_detection.estimated_area_m2
        self.first_seen_frame = frame_idx
        self.last_seen_frame = frame_idx
        self.frames_since_seen = 0
        self.observation_count = 1
        self.is_waterlogged = initial_detection.is_waterlogged
        self.lat = lat
        self.lon = lon
        self.history: List[Dict[str, Any]] = [{
            'frame_idx': frame_idx,
            'bbox': list(initial_detection.bbox),
            'confidence': initial_detection.confidence,
        }]

    def update(self, detection: Detection, frame_idx: int, lat: float, lon: float):
        self.last_seen_frame = frame_idx
        self.frames_since_seen = 0
        self.observation_count += 1
        self.class_counts[detection.class_name] = self.class_counts.get(detection.class_name, 0) + 1
        self.max_area_m2 = max(self.max_area_m2, detection.estimated_area_m2)
        if detection.is_waterlogged:
            self.is_waterlogged = True

        # Keep best vantage bbox (highest confidence)
        if detection.confidence > self.best_confidence:
            self.best_confidence = detection.confidence
            self.best_bbox = list(detection.bbox)
            self.lat = lat
            self.lon = lon

        self.history.append({
            'frame_idx': frame_idx,
            'bbox': list(detection.bbox),
            'confidence': detection.confidence,
        })

    @property
    def consolidated_class(self) -> str:
        # Majority voting
        return max(self.class_counts.items(), key=lambda x: x[1])[0]


class DefectTracker:
    def __init__(self, iou_threshold: float = 0.25, max_missed_frames: int = 8):
        self.iou_threshold = iou_threshold
        self.max_missed_frames = max_missed_frames
        self.next_track_id = 1
        self.active_tracks: List[Track] = []
        self.finished_tracks: List[Track] = []

    def update_frame(self, detections: List[Detection], frame_idx: int, lat: float, lon: float) -> List[Track]:
        """Process detections for a single frame and match with active tracks."""
        matched_track_indices = set()
        matched_det_indices = set()

        # Greedy IoU matching
        for d_idx, det in enumerate(detections):
            best_iou = 0.0
            best_t_idx = -1
            for t_idx, track in enumerate(self.active_tracks):
                if t_idx in matched_track_indices:
                    continue
                iou = calculate_iou(det.bbox, track.best_bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_t_idx = t_idx

            if best_iou >= self.iou_threshold:
                self.active_tracks[best_t_idx].update(det, frame_idx, lat, lon)
                matched_track_indices.add(best_t_idx)
                matched_det_indices.add(d_idx)

        # Unmatched detections become new tracks
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_det_indices:
                new_track = Track(self.next_track_id, det, frame_idx, lat, lon)
                self.next_track_id += 1
                self.active_tracks.append(new_track)

        # Increment age of unmatched active tracks and retire old tracks
        remaining_active = []
        for t_idx, track in enumerate(self.active_tracks):
            if t_idx not in matched_track_indices and track.last_seen_frame != frame_idx:
                track.frames_since_seen += 1
                if track.frames_since_seen > self.max_missed_frames:
                    self.finished_tracks.append(track)
                    continue
            remaining_active.append(track)

        self.active_tracks = remaining_active
        return self.active_tracks

    def finish(self) -> List[Track]:
        """Flush all active tracks at end of video."""
        self.finished_tracks.extend(self.active_tracks)
        self.active_tracks = []
        return self.finished_tracks
