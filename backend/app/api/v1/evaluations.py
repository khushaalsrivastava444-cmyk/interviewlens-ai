from typing import Any, Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.database import get_db
from app.models.user import User
from app.models.interview import InterviewSession, Question
from app.models.video import UploadedVideo
from app.models.transcript import Transcript
from app.models.evaluation import Evaluation
from app.schemas.evaluation import (
    EvaluationResponse,
    SessionReportResponse,
    CriterionAverage,
    QuestionEvaluationDetail,
    TimelineMarker,
    CriterionScore,
    SpeakingMetrics,
)
from app.services.evaluation_service import answer_evaluation_engine

router = APIRouter()


class EvaluationRequest(BaseModel):
    question_id: str
    session_id: Optional[str] = None
    video_id: Optional[str] = None
    candidate_answer: Optional[str] = None


@router.post("/evaluate", response_model=EvaluationResponse, status_code=status.HTTP_201_CREATED)
def evaluate_candidate_answer(
    request: EvaluationRequest,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Execute technical answer evaluation against question-specific rubrics.
    Calculates deterministic speaking metrics and contextual criteria scores.
    """
    question = db.query(Question).filter(Question.id == request.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    # Determine answer text and audio source
    candidate_answer = request.candidate_answer
    audio_path = None
    duration = None
    transcript_id = None
    transcript_segments = None

    if request.video_id:
        video = db.query(UploadedVideo).filter(UploadedVideo.id == request.video_id).first()
        if not video:
            raise HTTPException(status_code=404, detail="Video recording not found.")
        if video.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized.")
        
        audio_path = video.audio_path
        duration = video.duration_seconds

        # Get transcript if available
        transcript = db.query(Transcript).filter(Transcript.video_id == video.id).first()
        if transcript:
            transcript_id = transcript.id
            if not candidate_answer:
                candidate_answer = transcript.full_text
            if transcript.segments:
                transcript_segments = [
                    {"start_time": s.start_time, "end_time": s.end_time, "text": s.text}
                    for s in sorted(transcript.segments, key=lambda x: x.order_index)
                ]

    if not candidate_answer:
        raise HTTPException(
            status_code=400,
            detail="No candidate answer provided. Please provide text or an uploaded video with transcript."
        )

    # Run evaluation engine
    result = answer_evaluation_engine.evaluate_answer(
        question_text=question.question_text,
        category=question.category,
        candidate_answer=candidate_answer,
        expected_competencies=question.expected_competencies,
        difficulty=question.difficulty,
        audio_path=audio_path,
        video_duration=duration,
        transcript_segments=transcript_segments,
    )

    # Persist evaluation record
    evaluation = Evaluation(
        session_id=question.session_id,
        question_id=question.id,
        transcript_id=transcript_id,
        overall_score=result.overall_score,
        maximum_score=result.maximum_score,
        strengths=result.strengths,
        missing_concepts=result.missing_concepts,
        criteria_scores=[c.model_dump() for c in result.criteria_scores],
        recommended_follow_up=result.recommended_follow_up,
        speaking_metrics=result.speaking_metrics,
        timeline_markers=[m.model_dump() for m in result.timeline_markers],
        model_name=result.model_name,
        rubric_version=result.rubric_version,
        is_stale=False,
    )
    db.add(evaluation)

    # Update session average score if session exists
    session = db.query(InterviewSession).filter(InterviewSession.id == question.session_id).first()
    if session:
        all_evals = db.query(Evaluation).filter(Evaluation.session_id == session.id).all()
        scores = [e.overall_score for e in all_evals] + [result.overall_score]
        session.overall_score = round(sum(scores) / len(scores), 2)

    db.commit()
    db.refresh(evaluation)
    return evaluation


@router.get("/session/{session_id}/report", response_model=SessionReportResponse)
def get_session_report(
    session_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Generate an aggregated evidence-based report for an entire interview session.
    Combines radar chart competency metrics, acoustic analytics, and interactive timeline markers.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this report.")

    questions = (
        db.query(Question)
        .filter(Question.session_id == session.id)
        .order_by(Question.order_index.asc())
        .all()
    )

    questions_evaluations: List[QuestionEvaluationDetail] = []
    all_evaluations: List[Evaluation] = []
    aggregated_strengths_set = []
    aggregated_missing_set = []
    all_timeline_markers: List[TimelineMarker] = []

    criteria_accumulator: Dict[str, List[float]] = {}
    speaking_metric_totals = {
        "words_per_minute": [],
        "filler_words_detected": 0,
        "filler_words_per_minute": [],
        "pause_frequency": [],
        "long_pause_duration": [],
        "silence_ratio": [],
        "answer_duration": 0.0,
        "filler_breakdown": {},
    }

    for q in questions:
        # Latest evaluation for question
        ev = (
            db.query(Evaluation)
            .filter(Evaluation.question_id == q.id)
            .order_by(Evaluation.created_at.desc())
            .first()
        )

        video = (
            db.query(UploadedVideo)
            .filter(UploadedVideo.question_id == q.id)
            .order_by(UploadedVideo.created_at.desc())
            .first()
        )

        transcript_text = None
        if ev and ev.transcript_id:
            tr = db.query(Transcript).filter(Transcript.id == ev.transcript_id).first()
            if tr:
                transcript_text = tr.full_text
        elif video:
            tr = db.query(Transcript).filter(Transcript.video_id == video.id).first()
            if tr:
                transcript_text = tr.full_text

        q_detail = QuestionEvaluationDetail(
            question_id=q.id,
            question_text=q.question_text,
            category=q.category,
            difficulty=q.difficulty,
            order_index=q.order_index,
            evaluation_id=ev.id if ev else None,
            video_id=video.id if video else None,
            overall_score=ev.overall_score if ev else None,
            strengths=ev.strengths if ev else [],
            missing_concepts=ev.missing_concepts if ev else [],
            criteria_scores=[
                CriterionScore.model_validate(c) for c in (ev.criteria_scores or [])
            ] if ev else [],
            speaking_metrics=SpeakingMetrics.model_validate(ev.speaking_metrics) if ev and ev.speaking_metrics else None,
            timeline_markers=[
                TimelineMarker.model_validate(m) for m in (ev.timeline_markers or [])
            ] if ev and ev.timeline_markers else [],
            recommended_follow_up=ev.recommended_follow_up if ev else None,
            candidate_answer=transcript_text,
        )
        questions_evaluations.append(q_detail)

        if ev:
            all_evaluations.append(ev)
            for s in (ev.strengths or []):
                if s not in aggregated_strengths_set:
                    aggregated_strengths_set.append(s)
            for m in (ev.missing_concepts or []):
                if m not in aggregated_missing_set:
                    aggregated_missing_set.append(m)

            if ev.timeline_markers:
                for tm in ev.timeline_markers:
                    all_timeline_markers.append(TimelineMarker.model_validate(tm))

            for c in (ev.criteria_scores or []):
                name = c.get("name", "general")
                score = float(c.get("score", 0.0))
                if name not in criteria_accumulator:
                    criteria_accumulator[name] = []
                criteria_accumulator[name].append(score)

            if ev.speaking_metrics:
                sm = ev.speaking_metrics
                if "words_per_minute" in sm and sm["words_per_minute"]:
                    speaking_metric_totals["words_per_minute"].append(sm["words_per_minute"])
                if "filler_words_detected" in sm:
                    speaking_metric_totals["filler_words_detected"] += sm["filler_words_detected"]
                if "filler_words_per_minute" in sm and sm["filler_words_per_minute"]:
                    speaking_metric_totals["filler_words_per_minute"].append(sm["filler_words_per_minute"])
                if "pause_frequency" in sm and sm["pause_frequency"]:
                    speaking_metric_totals["pause_frequency"].append(sm["pause_frequency"])
                if "long_pause_duration" in sm and sm["long_pause_duration"]:
                    speaking_metric_totals["long_pause_duration"].append(sm["long_pause_duration"])
                if "silence_ratio" in sm and sm["silence_ratio"]:
                    speaking_metric_totals["silence_ratio"].append(sm["silence_ratio"])
                if "answer_duration" in sm and sm["answer_duration"]:
                    speaking_metric_totals["answer_duration"] += sm["answer_duration"]
                if "filler_words_breakdown" in sm and isinstance(sm["filler_words_breakdown"], dict):
                    for word, count in sm["filler_words_breakdown"].items():
                        speaking_metric_totals["filler_breakdown"][word] = (
                            speaking_metric_totals["filler_breakdown"].get(word, 0) + count
                        )

    # Format criteria averages for radar chart
    criteria_averages: List[CriterionAverage] = []
    for crit_name, scores in criteria_accumulator.items():
        formatted_name = crit_name.replace("_", " ").title()
        avg_score = round(sum(scores) / len(scores), 1)
        criteria_averages.append(
            CriterionAverage(
                name=formatted_name,
                score=avg_score,
                maximum_score=5.0,
                benchmark_score=3.5,
            )
        )

    # Calculate speaking averages
    wpm_list = speaking_metric_totals["words_per_minute"]
    filler_wpm_list = speaking_metric_totals["filler_words_per_minute"]
    pause_freq_list = speaking_metric_totals["pause_frequency"]
    silence_ratio_list = speaking_metric_totals["silence_ratio"]

    speaking_averages = {
        "avg_words_per_minute": round(sum(wpm_list) / len(wpm_list), 1) if wpm_list else 125.0,
        "total_filler_words": speaking_metric_totals["filler_words_detected"],
        "avg_filler_words_per_minute": round(sum(filler_wpm_list) / len(filler_wpm_list), 2) if filler_wpm_list else 0.0,
        "avg_pause_frequency": round(sum(pause_freq_list) / len(pause_freq_list), 2) if pause_freq_list else 0.0,
        "avg_silence_ratio": round(sum(silence_ratio_list) / len(silence_ratio_list), 2) if silence_ratio_list else 0.0,
        "total_speaking_duration": round(speaking_metric_totals["answer_duration"], 1),
        "filler_breakdown": speaking_metric_totals["filler_breakdown"],
    }

    # Overall score fallback
    overall_score = session.overall_score
    if (not overall_score or overall_score == 0.0) and all_evaluations:
        overall_score = round(sum(e.overall_score for e in all_evaluations) / len(all_evaluations), 2)

    return SessionReportResponse(
        session_id=session.id,
        title=session.title,
        category=session.category,
        difficulty=session.difficulty,
        target_role=session.target_role,
        status=session.status,
        overall_score=overall_score or 0.0,
        total_questions=len(questions),
        summary_feedback=session.summary_feedback,
        criteria_averages=criteria_averages,
        speaking_averages=speaking_averages,
        aggregated_strengths=aggregated_strengths_set,
        aggregated_missing_concepts=aggregated_missing_set,
        timeline_markers=all_timeline_markers,
        questions_evaluations=questions_evaluations,
        created_at=session.created_at,
    )


@router.get("/{evaluation_id}", response_model=EvaluationResponse)
def get_evaluation(
    evaluation_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve an evaluation report by ID."""
    evaluation = db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluation report not found.")

    session = db.query(InterviewSession).filter(InterviewSession.id == evaluation.session_id).first()
    if session and session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this evaluation.")

    return evaluation


@router.get("/question/{question_id}", response_model=EvaluationResponse)
def get_evaluation_for_question(
    question_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve the latest evaluation for a specific interview question."""
    evaluation = (
        db.query(Evaluation)
        .filter(Evaluation.question_id == question_id)
        .order_by(Evaluation.created_at.desc())
        .first()
    )
    if not evaluation:
        raise HTTPException(status_code=404, detail="No evaluation found for this question.")

    return evaluation
