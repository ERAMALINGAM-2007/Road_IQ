"""Tests for Geo Context, Risk Scoring, RHI, and Spatial Clustering."""

from backend.app.services.geo import haversine_distance_m, get_road_exposure, get_vulnerability
from backend.app.services.risk import calculate_risk
from backend.app.services.rhi import calculate_segment_rhi
from backend.app.services.clustering import cluster_defects_spatial
from backend.app.services.weather import get_weather_context


def test_haversine_distance():
    # 0 distance for identical coordinates
    assert haversine_distance_m(11.2742, 77.5828, 11.2742, 77.5828) == 0.0

    # Approx 111 km for 1 deg latitude
    d = haversine_distance_m(11.0, 77.0, 12.0, 77.0)
    assert 110000.0 <= d <= 112000.0


def test_road_exposure():
    exp = get_road_exposure(11.2720, 77.5850)
    assert 0.0 <= exp["exposure_score"] <= 1.0
    assert "road_name" in exp
    assert exp["speed_limit_kmh"] > 0


def test_vulnerability():
    # Directly at KEC main gate (school POI)
    vuln = get_vulnerability(11.2740, 77.6070)
    assert vuln["vulnerability_score"] > 0.5
    assert vuln["nearest_poi"] is not None

    # Middle of remote field (>1000m away)
    remote = get_vulnerability(11.3500, 77.4000)
    assert remote["vulnerability_score"] == 0.0


def test_risk_calculation_full():
    res = calculate_risk(
        severity_score=75.0,
        exposure_score=0.90,
        vulnerability_score=0.80,
        observation_count=5,
        days_unrepaired=14,
        rainfall_last_72h_mm=25.0,
    )
    assert 0.0 <= res["risk_score"] <= 100.0
    assert res["risk_level"] in ("medium", "high", "critical")
    assert "breakdown" in res
    assert res["breakdown"]["weather_time_points"] > 0


def test_risk_renormalisation_without_weather():
    res = calculate_risk(
        severity_score=75.0,
        exposure_score=0.90,
        vulnerability_score=0.80,
        observation_count=3,
        days_unrepaired=5,
        rainfall_last_72h_mm=None,  # missing weather telemetry
    )
    assert 0.0 <= res["risk_score"] <= 100.0
    assert "context_unavailable: weather" in res["context_notes"]
    assert res["breakdown"]["weather_time_points"] == 0.0


def test_rhi_calculation():
    defects = [
        {"severity_band": "critical", "est_area_m2": 0.50},
        {"severity_band": "high", "est_area_m2": 0.30},
        {"severity_band": "low", "est_area_m2": 0.10},
    ]
    rhi = calculate_segment_rhi(defects, segment_length_m=500.0)
    assert 0.0 <= rhi["rhi_score"] <= 100.0
    assert rhi["rhi_grade"] in ("A", "B", "C", "D", "F")
    assert rhi["defect_count"] == 3


def test_spatial_clustering():
    defects = [
        {"id": 1, "lat": 11.27420, "lon": 77.58280},
        {"id": 2, "lat": 11.27425, "lon": 77.58285},  # ~8m away -> same cluster
        {"id": 3, "lat": 11.28500, "lon": 77.59500},  # ~1.5km away -> separate cluster
    ]
    clusters = cluster_defects_spatial(defects, eps_m=15.0)
    assert len(clusters) == 2
    assert len(clusters[0]) == 2
    assert len(clusters[1]) == 1
