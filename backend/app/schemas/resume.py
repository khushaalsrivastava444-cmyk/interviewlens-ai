from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ParsedProject(BaseModel):
    name: str
    description: str
    technologies: List[str] = []
    metrics: List[str] = []
    highlights: List[str] = []


class ParsedExperience(BaseModel):
    title: str
    company: Optional[str] = None
    duration: Optional[str] = None
    responsibilities: List[str] = []


class ParsedEducation(BaseModel):
    degree: str
    institution: Optional[str] = None
    year: Optional[str] = None


class ResumeResponse(BaseModel):
    id: str
    user_id: str
    filename: str
    extracted_text: str
    parsed_skills: List[str] = []
    skills_by_category: Dict[str, List[str]] = {}
    parsed_projects: List[ParsedProject] = []
    parsed_experience: List[ParsedExperience] = []
    parsed_education: List[ParsedEducation] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class JobDescriptionMatchRequest(BaseModel):
    job_description_text: str = Field(..., min_length=20)
    target_role: Optional[str] = None


class JobDescriptionMatchResponse(BaseModel):
    match_score: float = Field(..., ge=0.0, le=100.0)
    matched_skills: List[str] = []
    missing_critical_skills: List[str] = []
    preferred_skills_found: List[str] = []
    ats_recommendations: List[str] = []
    recommended_interview_categories: List[str] = []


class ProjectDefenseQuestion(BaseModel):
    id: str
    project_name: str
    question_text: str
    technical_focus: str
    sample_expected_topics: List[str] = []


class ProjectDefenseResponse(BaseModel):
    resume_id: str
    candidate_name: Optional[str] = None
    questions: List[ProjectDefenseQuestion] = []


class LearningMilestone(BaseModel):
    phase: str
    title: str
    focus_areas: List[str] = []
    recommended_practice: str


class LearningPlanCreate(BaseModel):
    target_role: str
    session_id: Optional[str] = None
    job_description_text: Optional[str] = None


class LearningPlanResponse(BaseModel):
    id: str
    user_id: str
    session_id: Optional[str] = None
    target_role: str
    identified_gaps: List[str] = []
    recommended_topics: List[str] = []
    practice_questions: List[Dict[str, Any]] = []
    milestones: List[LearningMilestone] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
