import os
import uuid
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.api import deps
from app.database import get_db
from app.models.user import User
from app.models.resume import Resume, LearningPlan
from app.models.interview import InterviewSession
from app.models.evaluation import Evaluation
from app.schemas.resume import (
    ResumeResponse,
    ParsedProject,
    ParsedExperience,
    ParsedEducation,
    JobDescriptionMatchRequest,
    JobDescriptionMatchResponse,
    ProjectDefenseResponse,
    LearningPlanCreate,
    LearningPlanResponse,
    LearningMilestone,
)
from app.services.resume_service import resume_intelligence_service
from app.core.security_middleware import assert_safe_path
from app.core.config import settings

router = APIRouter()

STORAGE_DIR = settings.RESUME_STORAGE_DIR
try:
    os.makedirs(STORAGE_DIR, exist_ok=True)
except Exception:
    pass


def _serialize_resume_response(resume: Resume) -> ResumeResponse:
    skills, skills_by_category = resume_intelligence_service.extract_skills(resume.extracted_text)

    # Reconstruct Pydantic projects
    parsed_projects = [
        ParsedProject(**p) if isinstance(p, dict) else p
        for p in (resume.parsed_projects or [])
    ]
    parsed_experience = [
        ParsedExperience(**e) if isinstance(e, dict) else e
        for e in (resume.parsed_experience or [])
    ]
    parsed_education = [
        ParsedEducation(**ed) if isinstance(ed, dict) else ed
        for ed in (resume.parsed_education or [])
    ]

    return ResumeResponse(
        id=resume.id,
        user_id=resume.user_id,
        filename=resume.filename,
        extracted_text=resume.extracted_text,
        parsed_skills=resume.parsed_skills or skills,
        skills_by_category=skills_by_category,
        parsed_projects=parsed_projects,
        parsed_experience=parsed_experience,
        parsed_education=parsed_education,
        created_at=resume.created_at,
    )


@router.post("/upload", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_and_parse_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Upload and parse candidate resume (PDF, DOCX, TXT).
    Extracts technical skills, projects, metrics, work history, and education.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected.")

    ext = os.path.splitext(file.filename)[1].lower()
    allowed_exts = [".pdf", ".docx", ".doc", ".txt", ".md"]
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Allowed: {', '.join(allowed_exts)}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Resume file size exceeds maximum 15MB limit.")

    # 1. Extract raw text from file
    try:
        extracted_text = resume_intelligence_service.extract_text_from_file(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # 2. Extract structured entities
    parsed_skills, _ = resume_intelligence_service.extract_skills(extracted_text)
    projects = resume_intelligence_service.extract_projects(extracted_text)
    experiences, educations = resume_intelligence_service.extract_experience_and_education(extracted_text)

    # 3. Save file on disk
    saved_filename = f"{current_user.id}_{str(uuid.uuid4())[:8]}_{file.filename}"
    storage_path = os.path.join(STORAGE_DIR, saved_filename)
    safe_path = assert_safe_path(storage_path, STORAGE_DIR)
    with open(safe_path, "wb") as f:
        f.write(file_bytes)

    # 4. Save Resume in database
    resume = Resume(
        user_id=current_user.id,
        filename=file.filename,
        storage_path=safe_path,
        extracted_text=extracted_text,
        parsed_skills=parsed_skills,
        parsed_projects=[p.model_dump() for p in projects],
        parsed_experience=[e.model_dump() for e in experiences],
        parsed_education=[ed.model_dump() for ed in educations],
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)

    return _serialize_resume_response(resume)


@router.get("/latest", response_model=ResumeResponse)
def get_latest_resume(
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve the candidate's most recent uploaded resume with parsed entities."""
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == current_user.id)
        .order_by(Resume.created_at.desc())
        .first()
    )
    if not resume:
        raise HTTPException(status_code=404, detail="No resume found. Please upload a resume first.")

    return _serialize_resume_response(resume)


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume_by_id(
    resume_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve resume details by ID."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    return _serialize_resume_response(resume)


@router.post("/{resume_id}/match-jd", response_model=JobDescriptionMatchResponse)
def match_resume_with_job_description(
    resume_id: str,
    request: JobDescriptionMatchRequest,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Compare candidate resume skills and experience against a target Job Description.
    Calculates ATS alignment score, matches skills, and identifies missing critical requirements.
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    result = resume_intelligence_service.match_job_description(
        resume_skills=resume.parsed_skills or [],
        jd_text=request.job_description_text,
        target_role=request.target_role,
    )
    return result


@router.get("/{resume_id}/project-defense-questions", response_model=ProjectDefenseResponse)
def get_project_defense_questions(
    resume_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Generate deep architectural project defense questions derived directly
    from candidate's extracted projects, frameworks, and metrics.
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    projects = [
        ParsedProject(**p) if isinstance(p, dict) else p
        for p in (resume.parsed_projects or [])
    ]
    questions = resume_intelligence_service.generate_project_defense_questions(projects)

    return ProjectDefenseResponse(
        resume_id=resume.id,
        candidate_name=current_user.full_name,
        questions=questions,
    )


@router.post("/{resume_id}/generate-practice-plan", response_model=LearningPlanResponse)
def generate_practice_plan(
    resume_id: str,
    request: LearningPlanCreate,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Synthesize an actionable personalized study and mock interview plan
    based on resume gaps, target role, and past interview performance.
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found.")
    if resume.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    missing_skills = []
    # If a Job Description was supplied, get missing skills from it
    if request.job_description_text:
        match_result = resume_intelligence_service.match_job_description(
            resume_skills=resume.parsed_skills or [],
            jd_text=request.job_description_text,
            target_role=request.target_role,
        )
        missing_skills.extend(match_result.missing_critical_skills)

    # If a past interview session is specified, gather missing concepts from its evaluations
    identified_gaps = []
    if request.session_id:
        evals = db.query(Evaluation).filter(Evaluation.session_id == request.session_id).all()
        for ev in evals:
            for gap in (ev.missing_concepts or []):
                cleaned_gap = gap.replace("Did not cover ", "").split(" (")[0]
                if cleaned_gap not in identified_gaps:
                    identified_gaps.append(cleaned_gap)

    plan_data = resume_intelligence_service.generate_learning_plan(
        target_role=request.target_role,
        missing_skills=missing_skills,
        identified_gaps=identified_gaps,
    )

    learning_plan = LearningPlan(
        user_id=current_user.id,
        session_id=request.session_id,
        target_role=request.target_role,
        identified_gaps=plan_data["identified_gaps"],
        recommended_topics=plan_data["recommended_topics"],
        practice_questions=plan_data["practice_questions"],
        milestones=plan_data["milestones"],
    )
    db.add(learning_plan)
    db.commit()
    db.refresh(learning_plan)

    return LearningPlanResponse(
        id=learning_plan.id,
        user_id=learning_plan.user_id,
        session_id=learning_plan.session_id,
        target_role=learning_plan.target_role,
        identified_gaps=learning_plan.identified_gaps,
        recommended_topics=learning_plan.recommended_topics,
        practice_questions=learning_plan.practice_questions,
        milestones=[LearningMilestone(**m) for m in (learning_plan.milestones or [])],
        created_at=learning_plan.created_at,
    )


@router.get("/practice-plans/all", response_model=List[LearningPlanResponse])
def list_learning_plans(
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """List all personalized practice and learning plans generated for the candidate."""
    plans = (
        db.query(LearningPlan)
        .filter(LearningPlan.user_id == current_user.id)
        .order_by(LearningPlan.created_at.desc())
        .all()
    )
    return [
        LearningPlanResponse(
            id=p.id,
            user_id=p.user_id,
            session_id=p.session_id,
            target_role=p.target_role,
            identified_gaps=p.identified_gaps or [],
            recommended_topics=p.recommended_topics or [],
            practice_questions=p.practice_questions or [],
            milestones=[LearningMilestone(**m) for m in (p.milestones or [])],
            created_at=p.created_at,
        )
        for p in plans
    ]


@router.get("/practice-plans/{plan_id}", response_model=LearningPlanResponse)
def get_learning_plan(
    plan_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve a specific learning plan by ID."""
    plan = db.query(LearningPlan).filter(LearningPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Learning plan not found.")
    if plan.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    return LearningPlanResponse(
        id=plan.id,
        user_id=plan.user_id,
        session_id=plan.session_id,
        target_role=plan.target_role,
        identified_gaps=plan.identified_gaps or [],
        recommended_topics=plan.recommended_topics or [],
        practice_questions=plan.practice_questions or [],
        milestones=[LearningMilestone(**m) for m in (plan.milestones or [])],
        created_at=plan.created_at,
    )
