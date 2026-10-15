"""Tests for Severity Scoring Engine."""

from backend.app.services.severity import calculate_severity, squash_area


def test_squash_area():
    assert squash_area(0.0) == 0.0
    assert squash_area(2.5) == 1.0
    mid_area = squash_area(0.5)
    assert 0.4 <= mid_area <= 0.6


def test_calculate_severity_pothole():
    res = calculate_severity(
        class_name="pothole",
        estimated_area_m2=0.45,
        lane_position="wheel_path",
        is_waterlogged=False,
    )
    assert 0.0 <= res["score"] <= 100.0
    assert res["band"] in ("medium", "high", "critical")
    assert "breakdown" in res
    assert res["breakdown"]["class_contribution"] > 0


def test_water_bonus():
    dry = calculate_severity("pothole", 0.20, is_waterlogged=False)
    wet = calculate_severity("pothole", 0.20, is_waterlogged=True)
    assert wet["score"] > dry["score"]
    assert wet["breakdown"]["water_bonus"] == 8.0


def test_safety_override_fast_road():
    # Small pothole but on fast road (≥60km/h) with width ≥30cm should be elevated to High (≥50)
    res = calculate_severity(
        class_name="pothole",
        estimated_area_m2=0.10,
        estimated_width_cm=35.0,
        road_speed_limit_kmh=80,
    )
    assert res["score"] >= 50.0
    assert len(res["overrides"]) > 0
