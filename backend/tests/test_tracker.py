"""Tests for Video Temporal Tracker and IoU Association."""

from backend.app.services.tracker import DefectTracker, calculate_iou
from backend.app.services.detector import Detection


def test_calculate_iou():
    box1 = [100.0, 100.0, 200.0, 200.0]
    box2 = [100.0, 100.0, 200.0, 200.0]
    assert calculate_iou(box1, box2) == 1.0

    box3 = [300.0, 300.0, 400.0, 400.0]
    assert calculate_iou(box1, box3) == 0.0


def test_tracker_association():
    tracker = DefectTracker(iou_threshold=0.20, max_missed_frames=3)

    # Frame 0: first sighting
    det0 = Detection(
        class_id=0,
        class_name="pothole",
        confidence=0.82,
        bbox=[200.0, 300.0, 350.0, 450.0],
        estimated_area_m2=0.20,
    )
    active = tracker.update_frame([det0], frame_idx=0, lat=11.2742, lon=77.5828)
    assert len(active) == 1
    assert active[0].observation_count == 1

    # Frame 1: moved slightly as car advances (overlapping)
    det1 = Detection(
        class_id=0,
        class_name="pothole",
        confidence=0.88,
        bbox=[205.0, 310.0, 355.0, 460.0],
        estimated_area_m2=0.22,
    )
    active = tracker.update_frame([det1], frame_idx=1, lat=11.2743, lon=77.5829)
    assert len(active) == 1
    assert active[0].observation_count == 2
    assert active[0].best_confidence == 0.88

    # Finish tracking
    finished = tracker.finish()
    assert len(finished) == 1
    assert finished[0].first_seen_frame == 0
    assert finished[0].last_seen_frame == 1
