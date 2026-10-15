"""Tests for health and system endpoints."""


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert data["database"] == "sqlite_wal"


def test_model_metrics(client):
    response = client.get("/api/model/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "overall" in data
    assert data["overall"]["mAP50"] > 0.0
