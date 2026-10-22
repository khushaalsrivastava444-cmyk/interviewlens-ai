import pytest
import io
from app.models.interview import InterviewSession, Question
from app.models.video import UploadedVideo
from app.services.audio_analytics import audio_analytics_engine
from app.services.evaluation_service import answer_evaluation_engine
from app.services.background_worker import process_video_job


@pytest.fixture
def test_session_and_question(db_session, test_user):
    session = InterviewSession(
        user_id=test_user.id,
        title="ML & LLM Mock Interview",
        category="ml_dl",
        difficulty="entry",
        target_role="Machine Learning Engineer",
        status="in_progress",
        question_budget=5,
    )
    db_session.add(session)
    db_session.commit()
    db_session.refresh(session)

    question = Question(
        session_id=session.id,
        question_text="How would you evaluate a machine learning model on an imbalanced dataset and prevent data leakage?",
        category="ml_dl",
        difficulty="entry",
        question_type="initial",
        expected_competencies=["cross_validation", "precision_recall", "data_leakage"],
        order_index=0,
    )
    db_session.add(question)
    db_session.commit()
    db_session.refresh(question)

    return session, question


def test_audio_analytics_filler_words_detection():
    # Text with both real filler words and words that contain filler substrings (e.g. likely, drum)
    text = (
        "Um, so basically, I think that the model is likely to overfit. "
        "You know, actually, we should, uh, evaluate precision and recall, i mean, so yeah."
    )
    result = audio_analytics_engine.detect_filler_words(text)
    assert result["total_count"] >= 6
    assert "um" in result["breakdown"]
    assert "basically" in result["breakdown"]
    assert "you know" in result["breakdown"]
    assert "actually" in result["breakdown"]
    assert "uh" in result["breakdown"]
    assert "so yeah" in result["breakdown"]
    assert "i mean" in result["breakdown"]
    # "likely" must NOT be counted as "like"
    assert "like" not in result["breakdown"]


def test_audio_analytics_metrics_calculation():
    text = "In this project we evaluated precision and recall on the test dataset."
    metrics = audio_analytics_engine.compute_metrics(
        transcript_text=text,
        audio_path=None,
        override_duration=6.0  # 6 seconds for 12 words = 120 WPM
    )
    assert metrics["word_count"] == 12
    assert metrics["answer_duration"] == 6.0
    assert metrics["words_per_minute"] == 120.0
    assert metrics["filler_words_detected"] == 0


def test_rubric_evaluation_engine_with_strengths_and_gaps():
    question = "How would you handle an imbalanced dataset and prevent data leakage?"
    # Answer that covers cross-validation and metrics, but omits scaler data leakage
    answer = (
        "I would evaluate the model using precision, recall, and the PR-AUC curve rather than accuracy. "
        "I would also use 5-fold stratified cross validation on the dataset."
    )
    eval_result = answer_evaluation_engine.evaluate_answer(
        question_text=question,
        category="ml_dl",
        candidate_answer=answer,
        video_duration=15.0
    )

    assert 1.0 <= eval_result.overall_score <= 5.0
    assert len(eval_result.strengths) >= 2
    assert any("metrics" in s.lower() for s in eval_result.strengths)
    # Check that data leakage omission was flagged in missing concepts
    assert any("leakage" in m.lower() for m in eval_result.missing_concepts)
    # Recommended follow up should focus on the missing gap
    assert eval_result.recommended_follow_up is not None
    assert "data leakage" in eval_result.recommended_follow_up.lower() or "leakage" in eval_result.recommended_follow_up.lower()


def test_transcription_and_evaluation_workflow(
    client, auth_headers, test_session_and_question, synthetic_video_path, db_session
):
    session, question = test_session_and_question

    # 1. Upload video
    with open(synthetic_video_path, "rb") as f:
        file_bytes = f.read()
    data = {"file": ("interview_ans.mp4", io.BytesIO(file_bytes), "video/mp4")}
    upload_res = client.post("/api/v1/videos/upload", headers=auth_headers, files=data)
    assert upload_res.status_code == 202
    video_id = upload_res.json()["id"]

    # 2. Process video in background worker
    process_video_job(video_id, db_session)

    # 3. Generate transcript
    trans_res = client.post(f"/api/v1/transcripts/generate/{video_id}", headers=auth_headers)
    assert trans_res.status_code == 201
    transcript_data = trans_res.json()
    assert "full_text" in transcript_data
    assert len(transcript_data["segments"]) > 0
    assert transcript_data["segments"][0]["start_time"] >= 0
    assert transcript_data["is_user_edited"] is False
    transcript_id = transcript_data["id"]

    # 4. Evaluate answer against question rubric
    eval_req = {
        "question_id": question.id,
        "video_id": video_id,
        "session_id": session.id
    }
    eval_res = client.post("/api/v1/evaluations/evaluate", json=eval_req, headers=auth_headers)
    assert eval_res.status_code == 201
    eval_data = eval_res.json()
    assert eval_data["question_id"] == question.id
    assert eval_data["overall_score"] >= 1.0
    assert len(eval_data["criteria_scores"]) >= 3
    assert eval_data["speaking_metrics"] is not None
    assert eval_data["speaking_metrics"]["words_per_minute"] > 0
    assert eval_data["is_stale"] is False
    eval_id = eval_data["id"]

    # 5. Candidate corrects transcript -> prior evaluation marked stale
    update_req = {
        "full_text": "Corrected: In my machine learning project, I strictly avoided data leakage by fitting the scaler on train folds only."
    }
    update_res = client.put(f"/api/v1/transcripts/{transcript_id}", json=update_req, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["is_user_edited"] is True

    # Check evaluation is now stale
    stale_eval = client.get(f"/api/v1/evaluations/{eval_id}", headers=auth_headers)
    assert stale_eval.status_code == 200
    assert stale_eval.json()["is_stale"] is True


def test_audio_analytics_endpoint(client, auth_headers, synthetic_video_path, db_session):
    with open(synthetic_video_path, "rb") as f:
        file_bytes = f.read()
    data = {"file": ("audio_analytics_test.mp4", io.BytesIO(file_bytes), "video/mp4")}
    upload_res = client.post("/api/v1/videos/upload", headers=auth_headers, files=data)
    video_id = upload_res.json()["id"]

    process_video_job(video_id, db_session)

    res = client.get(f"/api/v1/audio-analytics/analyze/{video_id}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert "answer_duration" in data["metrics"]
    assert "silence_ratio" in data["metrics"]
