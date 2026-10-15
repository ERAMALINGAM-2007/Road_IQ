"""End-to-end API tests for surveys, defects, and review workflow."""

from sqlmodel import Session, select
from backend.app.core.database import engine
from backend.app.models.schema import Defect, Survey


def test_survey_create_and_list(client):
    res = client.post("/api/surveys", data={"road_name": "SH-96 Perundurai - Erode"})
    assert res.status_code == 202
    data = res.json()
    assert "id" in data
    assert data["status"] == "processing"

    list_res = client.get("/api/surveys")
    assert list_res.status_code == 200
    surveys = list_res.json()
    assert len(surveys) >= 1


def test_segments_list(client):
    res = client.get("/api/segments")
    assert res.status_code == 200
    segments = res.json()
    assert len(segments) >= 1
    assert "rhi_score" in segments[0]


def test_defect_review_workflow(client):
    # Insert a temporary defect directly for verification test
    with Session(engine) as session:
        survey = session.exec(select(Survey)).first()
        if not survey:
            survey = Survey(name="Test Survey")
            session.add(survey)
            session.commit()
            session.refresh(survey)

        defect = Defect(
            survey_id=survey.id,
            class_name="pothole",
            severity_band="high",
            severity_score=68.5,
            risk_score=72.0,
            status="detected",
        )
        session.add(defect)
        session.commit()
        session.refresh(defect)
        defect_id = defect.id

    # 1. Fetch single defect
    get_res = client.get(f"/api/defects/{defect_id}")
    assert get_res.status_code == 200
    d_data = get_res.json()
    assert d_data["class_name"] == "pothole"
    assert "breakdown" in d_data

    # 2. Review action: Reclassify to surface_damage
    review_res = client.post(
        f"/api/defects/{defect_id}/review",
        json={
            "action": "reclassify",
            "new_class": "surface_damage",
            "comment": "Reclassified from pothole to severe alligator cracking",
            "reviewer_role": "engineer",
        },
    )
    assert review_res.status_code == 200
    rev_data = review_res.json()
    assert rev_data["class_name"] == "surface_damage"
    assert rev_data["review_status"] == "reclassified"

    # 3. Review action: Approve
    approve_res = client.post(
        f"/api/defects/{defect_id}/review",
        json={
            "action": "approve",
            "comment": "Verified for patch work order",
            "reviewer_role": "engineer",
        },
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "verified"
