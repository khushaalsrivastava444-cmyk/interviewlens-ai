import pytest
from app.models.interview import InterviewSession, Question


def test_create_session_and_initial_question(client, auth_headers):
    payload = {
        "title": "NLP & Transformers Practice",
        "category": "nlp_llm_rag",
        "difficulty": "entry",
        "target_role": "NLP Engineer",
        "question_budget": 3
    }
    response = client.post("/api/v1/interviews/sessions", json=payload, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "NLP & Transformers Practice"
    assert data["status"] == "in_progress"
    assert data["question_budget"] == 3
    assert data["current_question_index"] == 0
    assert len(data["questions"]) == 1
    
    first_q = data["questions"][0]
    assert first_q["question_type"] == "initial"
    assert "rag" in first_q["question_text"].lower() or "retrieval" in first_q["question_text"].lower()


def test_stateful_adaptive_follow_up_progression(client, auth_headers):
    # 1. Create a 2-question budget session
    create_payload = {
        "title": "Machine Learning Diagnostic",
        "category": "ml_dl",
        "difficulty": "entry",
        "target_role": "Machine Learning Engineer",
        "question_budget": 2
    }
    res = client.post("/api/v1/interviews/sessions", json=create_payload, headers=auth_headers)
    assert res.status_code == 201
    session_data = res.json()
    session_id = session_data["id"]
    initial_question_id = session_data["questions"][0]["id"]

    # 2. Submit Turn 1: Candidate discusses metrics and train-test split, omitting data leakage
    answer_turn_1 = {
        "question_id": initial_question_id,
        "candidate_answer": "I would evaluate the model using precision, recall, and stratified cross-validation."
    }
    turn_1_res = client.post(f"/api/v1/interviews/sessions/{session_id}/answer", json=answer_turn_1, headers=auth_headers)
    assert turn_1_res.status_code == 200
    turn_1_data = turn_1_res.json()
    
    # Verify Turn 1 evaluation
    assert turn_1_data["evaluation"]["overall_score"] >= 1.0
    assert turn_1_data["session_status"] == "in_progress"
    assert turn_1_data["current_question_index"] == 1
    assert turn_1_data["remaining_budget"] == 1
    
    # Verify Adaptive Follow-Up Question
    next_q = turn_1_data["next_question"]
    assert next_q is not None
    assert next_q["parent_question_id"] == initial_question_id
    # Follow-up must probe the omitted data leakage topic
    assert next_q["follow_up_reason"] is not None
    assert "leakage" in next_q["question_text"].lower() or "leakage" in next_q["follow_up_reason"].lower()
    adaptive_question_id = next_q["id"]

    # 3. Submit Turn 2 (Final turn for budget = 2)
    answer_turn_2 = {
        "question_id": adaptive_question_id,
        "candidate_answer": "To prevent data leakage, I fit the standard scaler only on the training fold and transform the test fold."
    }
    turn_2_res = client.post(f"/api/v1/interviews/sessions/{session_id}/answer", json=answer_turn_2, headers=auth_headers)
    assert turn_2_res.status_code == 200
    turn_2_data = turn_2_res.json()

    # Session budget exhausted -> session completed
    assert turn_2_data["session_status"] == "completed"
    assert turn_2_data["remaining_budget"] == 0
    assert turn_2_data["next_question"] is None
    assert turn_2_data["summary_feedback"] is not None
    assert "Candidate completed 2 question turns" in turn_2_data["summary_feedback"]


def test_early_session_completion(client, auth_headers):
    # Create session with budget 5
    payload = {
        "title": "Backend Architecture",
        "category": "backend_sys_design",
        "difficulty": "entry",
        "target_role": "Backend Engineer",
        "question_budget": 5
    }
    create_res = client.post("/api/v1/interviews/sessions", json=payload, headers=auth_headers)
    session_id = create_res.json()["id"]

    # End session early
    complete_res = client.post(f"/api/v1/interviews/sessions/{session_id}/complete", headers=auth_headers)
    assert complete_res.status_code == 200
    data = complete_res.json()
    assert data["status"] == "completed"
    assert data["summary_feedback"] is not None


def test_session_ownership_protection(client, auth_headers):
    # Create session as test_user
    payload = {
        "title": "Private Session",
        "category": "python",
        "difficulty": "entry",
        "target_role": "Python Developer",
        "question_budget": 3
    }
    res = client.post("/api/v1/interviews/sessions", json=payload, headers=auth_headers)
    session_id = res.json()["id"]

    # Register second user and attempt to access
    user2 = {
        "email": "intruder_session@example.com",
        "password": "Password123!",
        "full_name": "Intruder User",
        "target_role": "Hacker",
        "experience_level": "entry"
    }
    reg = client.post("/api/v1/auth/register", json=user2)
    token2 = reg.json()["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}

    forbidden_res = client.get(f"/api/v1/interviews/sessions/{session_id}", headers=headers2)
    assert forbidden_res.status_code == 403
