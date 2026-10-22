from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class CriterionScore(BaseModel):
    name: str
    score: float = Field(..., ge=0, le=5)
    maximum_score: float = Field(default=5.0)
    evidence: List[str] = []
    feedback: str


class SpeakingMetrics(BaseModel):
    words_per_minute: float
    answer_duration: float
    filler_words_detected: int
    filler_words_per_minute: float
    pause_frequency: float
    long_pause_duration: float
    silence_ratio: float
    filler_words_breakdown: Optional[Dict[str, int]] = None
    pause_count: Optional[int] = None
    word_count: Optional[int] = None


class VisualMetrics(BaseModel):
    framing_adequacy: str
    lighting_adequacy: str
    subject_visible: bool
    interruptions_detected: int


class TimelineMarker(BaseModel):
    timestamp: float
    concept: str
    quote: str
    marker_type: str = "strength"  # "strength", "gap", "hesitation"


class EvaluationResponse(BaseModel):
    id: str
    session_id: str
    question_id: str
    transcript_id: Optional[str] = None
    overall_score: float
    maximum_score: float = 5.0
    strengths: List[str] = []
    missing_concepts: List[str] = []
    criteria_scores: List[CriterionScore] = []
    recommended_follow_up: Optional[str] = None
    speaking_metrics: Optional[SpeakingMetrics] = None
    timeline_markers: List[TimelineMarker] = []
    visual_metrics: Optional[VisualMetrics] = None
    model_name: str
    rubric_version: str
    is_stale: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CriterionAverage(BaseModel):
    name: str
    score: float
    maximum_score: float = 5.0
    benchmark_score: float = 3.5


class QuestionEvaluationDetail(BaseModel):
    question_id: str
    question_text: str
    category: str
    difficulty: str
    order_index: int
    evaluation_id: Optional[str] = None
    video_id: Optional[str] = None
    overall_score: Optional[float] = None
    strengths: List[str] = []
    missing_concepts: List[str] = []
    criteria_scores: List[CriterionScore] = []
    speaking_metrics: Optional[SpeakingMetrics] = None
    timeline_markers: List[TimelineMarker] = []
    recommended_follow_up: Optional[str] = None
    candidate_answer: Optional[str] = None


class SessionReportResponse(BaseModel):
    session_id: str
    title: str
    category: str
    difficulty: str
    target_role: Optional[str] = None
    status: str
    overall_score: float
    total_questions: int
    summary_feedback: Optional[str] = None
    criteria_averages: List[CriterionAverage] = []
    speaking_averages: Dict[str, Any] = {}
    aggregated_strengths: List[str] = []
    aggregated_missing_concepts: List[str] = []
    timeline_markers: List[TimelineMarker] = []
    questions_evaluations: List[QuestionEvaluationDetail] = []
    created_at: datetime
