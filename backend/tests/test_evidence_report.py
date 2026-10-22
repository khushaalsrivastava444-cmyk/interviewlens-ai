import pytest
from fastapi.testclient import TestClient
from app.services.evaluation_service import answer_evaluation_engine


def test_timeline_markers_generation_with_segments():
    """Verify that rubric evaluation matches segments to generate timestamped timeline markers."""
    segments = [
        {"start_time": 0.0, "end_time": 4.5, "text": "Um, hello, so yeah basically I would use cross validation."},
        {"start_time": 4.5, "end_time": 9.2, "text": "To prevent data leakage, we should fit the scaler only on the training fold."},
        {"start_time": 9.2, "end_time": 14.0, "text": "And finally we evaluate with precision and recall rather than simple accuracy."},
    ]
    full_text = " ".join(s["text"] for s in segments)

    result = answer_evaluation_engine.evaluate_answer(
        question_text="How do you handle train/test splitting and avoid data leakage in an ML pipeline?",
        category="ml_dl",
        candidate_answer=full_text,
        transcript_segments=segments,
    )

    assert result.overall_score > 0
    assert len(result.strengths) >= 2
    assert len(result.timeline_markers) > 0

    # Verify markers contain timestamps and types
    strength_markers = [m for m in result.timeline_markers if m.marker_type == "strength"]
    assert len(strength_markers) >= 2
    # Check that data leakage matched segment 1 (start_time 4.5)
    leakage_marker = next((m for m in strength_markers if "leakage" in m.concept.lower()), None)
    assert leakage_marker is not None
    assert leakage_marker.timestamp >= 4.0

    # Check that hesitation / filler markers were detected
    hesitation_markers = [m for m in result.timeline_markers if m.marker_type == "hesitation"]
    assert len(hesitation_markers) >= 1
    assert hesitation_markers[0].timestamp == 0.0


def test_session_report_endpoint(client: TestClient, auth_headers: dict):
    # 1. Create a session
    sess_payload = {
        "title": "Senior ML Engineer Evaluation",
        "category": "ml_dl",
        "difficulty": "mid",
        "target_role": "Machine Learning Engineer",
        "question_budget": 2,
    }
    res = client.post("/api/v1/interviews/sessions", json=sess_payload, headers=auth_headers)
    assert res.status_code == 201
    session_data = res.json()
    session_id = session_data["id"]
    first_question = session_data["questions"][0]

    # 2. Answer question 1
    answer1_payload = {
        "question_id": first_question["id"],
        "candidate_answer": (
            "In machine learning, we split the data into training and test sets. "
            "We use k-fold cross validation and must prevent data leakage by fitting the scaler "
            "only on the training fold. For imbalanced datasets, we monitor precision and recall."
        ),
    }
    turn1_res = client.post(
        f"/api/v1/interviews/sessions/{session_id}/answer",
        json=answer1_payload,
        headers=auth_headers,
    )
    assert turn1_res.status_code == 200
    turn1_data = turn1_res.json()
    assert turn1_data["next_question"] is not None

    # 3. Answer question 2 (final question to complete session)
    next_q = turn1_data["next_question"]
    answer2_payload = {
        "question_id": next_q["id"],
        "candidate_answer": (
            "To prevent data leakage during feature scaling, we use a scikit-learn Pipeline. "
            "The fit_transform method is invoked strictly within each training fold, while "
            "only transform is called on the validation fold."
        ),
    }
    turn2_res = client.post(
        f"/api/v1/interviews/sessions/{session_id}/answer",
        json=answer2_payload,
        headers=auth_headers,
    )
    assert turn2_res.status_code == 200
    assert turn2_res.json()["session_status"] == "completed"

    # 4. Fetch the consolidated session report
    report_res = client.get(
        f"/api/v1/evaluations/session/{session_id}/report",
        headers=auth_headers,
    )
    assert report_res.status_code == 200
    report = report_res.json()

    assert report["session_id"] == session_id
    assert report["status"] == "completed"
    assert report["overall_score"] > 0
    assert report["total_questions"] == 2
    assert len(report["criteria_averages"]) > 0
    assert "avg_words_per_minute" in report["speaking_averages"]
    assert len(report["questions_evaluations"]) == 2
    assert report["summary_feedback"] is not None


def test_session_report_unauthorized(client: TestClient, auth_headers: dict, db_session):
    from app.models.user import User
    from app.core.security import get_password_hash, create_access_token

    # User 1 creates session
    res = client.post(
        "/api/v1/interviews/sessions",
        json={"title": "Private Session", "category": "python", "difficulty": "entry", "question_budget": 1},
        headers=auth_headers,
    )
    assert res.status_code == 201
    session_id = res.json()["id"]

    # Create User 2
    user2 = User(
        email="other@interviewlens.ai",
        hashed_password=get_password_hash("Password123!"),
        full_name="Other User",
        target_role="Developer",
        is_active=True,
    )
    db_session.add(user2)
    db_session.commit()
    db_session.refresh(user2)
    u2_token = create_access_token(subject=user2.id)
    u2_headers = {"Authorization": f"Bearer {u2_token}"}

    # User 2 tries to access report
    report_res = client.get(
        f"/api/v1/evaluations/session/{session_id}/report",
        headers=u2_headers,
    )
    assert report_res.status_code == 403
