from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api import deps
from app.database import get_db
from app.models.user import User
from app.models.interview import InterviewSession, Question
from app.models.video import UploadedVideo
from app.models.transcript import Transcript
from app.models.evaluation import Evaluation
from app.schemas.interview import (
    InterviewSessionCreate,
    InterviewSessionResponse,
    QuestionResponse,
)
from app.schemas.evaluation import EvaluationResponse
from app.services.adaptive_engine import adaptive_engine
from app.services.evaluation_service import answer_evaluation_engine

router = APIRouter()


class AnswerSubmissionRequest(BaseModel):
    question_id: str
    video_id: Optional[str] = None
    candidate_answer: Optional[str] = None


class TurnResponse(BaseModel):
    evaluation: EvaluationResponse
    next_question: Optional[QuestionResponse] = None
    session_status: str
    current_question_index: int
    remaining_budget: int
    summary_feedback: Optional[str] = None


@router.post("/sessions", response_model=InterviewSessionResponse, status_code=status.HTTP_201_CREATED)
def create_interview_session(
    session_in: InterviewSessionCreate,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Initialize a stateful mock interview session.
    Automatically generates the first foundational question for the chosen category and difficulty.
    """
    session = InterviewSession(
        user_id=current_user.id,
        title=session_in.title,
        category=session_in.category,
        difficulty=session_in.difficulty,
        target_role=session_in.target_role,
        question_budget=session_in.question_budget,
        current_question_index=0,
        status="in_progress",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Generate and link initial foundational question
    initial_q_data = adaptive_engine.get_initial_question(
        category=session.category,
        difficulty=session.difficulty,
    )
    question = Question(
        session_id=session.id,
        question_text=initial_q_data["question_text"],
        category=initial_q_data["category"],
        difficulty=initial_q_data["difficulty"],
        question_type=initial_q_data["question_type"],
        expected_competencies=initial_q_data["expected_competencies"],
        rubric=initial_q_data["rubric"],
        order_index=0,
    )
    db.add(question)
    db.commit()
    db.refresh(session)

    return session


@router.get("/sessions", response_model=List[InterviewSessionResponse])
def list_interview_sessions(
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """List all interview sessions belonging to the authenticated candidate."""
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )
    return sessions


@router.get("/sessions/{session_id}", response_model=InterviewSessionResponse)
def get_interview_session(
    session_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve full details of an interview session, including questions and status."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    return session


@router.post("/sessions/{session_id}/answer", response_model=TurnResponse)
def submit_answer_and_progress(
    session_id: str,
    submission: AnswerSubmissionRequest,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Stateful turn processing:
    1. Evaluates candidate answer against question rubric and speaking acoustics.
    2. Identifies strengths and missing concepts.
    3. Checks remaining question budget.
    4. Dynamically generates targeted adaptive follow-up or finalizes session summary.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
    if session.status == "completed":
        raise HTTPException(status_code=400, detail="This interview session is already completed.")

    question = db.query(Question).filter(Question.id == submission.question_id).first()
    if not question or question.session_id != session.id:
        raise HTTPException(status_code=404, detail="Question not found in this interview session.")

    # Determine answer text & audio metrics source
    candidate_answer = submission.candidate_answer
    audio_path = None
    duration = None
    transcript_id = None
    transcript_segments = None

    if submission.video_id:
        video = db.query(UploadedVideo).filter(UploadedVideo.id == submission.video_id).first()
        if video and video.user_id == current_user.id:
            audio_path = video.audio_path
            duration = video.duration_seconds
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
        raise HTTPException(status_code=400, detail="Answer text or processed video transcript is required.")

    # 1. Evaluate answer
    eval_result = answer_evaluation_engine.evaluate_answer(
        question_text=question.question_text,
        category=question.category,
        candidate_answer=candidate_answer,
        expected_competencies=question.expected_competencies,
        difficulty=question.difficulty,
        audio_path=audio_path,
        video_duration=duration,
        transcript_segments=transcript_segments,
    )

    evaluation = Evaluation(
        session_id=session.id,
        question_id=question.id,
        transcript_id=transcript_id,
        overall_score=eval_result.overall_score,
        maximum_score=eval_result.maximum_score,
        strengths=eval_result.strengths,
        missing_concepts=eval_result.missing_concepts,
        criteria_scores=[c.model_dump() for c in eval_result.criteria_scores],
        recommended_follow_up=eval_result.recommended_follow_up,
        speaking_metrics=eval_result.speaking_metrics,
        timeline_markers=[m.model_dump() for m in eval_result.timeline_markers],
        model_name=eval_result.model_name,
        rubric_version=eval_result.rubric_version,
        is_stale=False,
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)

    # 2. Advance session turn
    session.current_question_index += 1
    remaining_budget = session.question_budget - session.current_question_index

    next_question_obj: Optional[Question] = None

    if remaining_budget > 0:
        # Generate targeted adaptive follow-up
        next_q_data = adaptive_engine.generate_next_follow_up(
            current_question=question,
            candidate_answer=candidate_answer,
            evaluation=evaluation,
            turn_index=session.current_question_index,
            remaining_budget=remaining_budget,
        )

        next_question_obj = Question(
            session_id=session.id,
            parent_question_id=next_q_data["parent_question_id"],
            question_text=next_q_data["question_text"],
            category=next_q_data["category"],
            difficulty=next_q_data["difficulty"],
            question_type=next_q_data["question_type"],
            follow_up_reason=next_q_data["follow_up_reason"],
            expected_competencies=next_q_data["expected_competencies"],
            rubric=next_q_data["rubric"],
            order_index=next_q_data["order_index"],
        )
        db.add(next_question_obj)
        db.commit()
        db.refresh(next_question_obj)
    else:
        # Budget exhausted: complete session and generate summary
        session.status = "completed"
        all_evals = db.query(Evaluation).filter(Evaluation.session_id == session.id).all()
        session.summary_feedback = adaptive_engine.generate_summary_feedback(session, all_evals)
        session.overall_score = round(sum(e.overall_score for e in all_evals) / len(all_evals), 2)
        db.commit()

    db.refresh(session)

    return TurnResponse(
        evaluation=EvaluationResponse.model_validate(evaluation),
        next_question=QuestionResponse.model_validate(next_question_obj) if next_question_obj else None,
        session_status=session.status,
        current_question_index=session.current_question_index,
        remaining_budget=remaining_budget,
        summary_feedback=session.summary_feedback,
    )


@router.post("/sessions/{session_id}/complete", response_model=InterviewSessionResponse)
def complete_interview_early(
    session_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Manually end an interview session early and generate final synthesis feedback."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")
    if session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    session.status = "completed"
    all_evals = db.query(Evaluation).filter(Evaluation.session_id == session.id).all()
    if all_evals:
        session.summary_feedback = adaptive_engine.generate_summary_feedback(session, all_evals)
        session.overall_score = round(sum(e.overall_score for e in all_evals) / len(all_evals), 2)
    else:
        session.summary_feedback = "Interview concluded before any answers were recorded."
        session.overall_score = 0.0

    db.commit()
    db.refresh(session)
    return session
