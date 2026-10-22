from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict


class QuestionBase(BaseModel):
    question_text: str
    category: str
    difficulty: str = "entry"
    question_type: str = "initial"
    expected_competencies: List[str] = []
    rubric: Dict[str, Any] = {}
    order_index: int = 0
    parent_question_id: Optional[str] = None
    follow_up_reason: Optional[str] = None


class QuestionResponse(QuestionBase):
    id: str
    session_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewSessionCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    category: str = Field(..., description="One of the 10 interview categories")
    difficulty: str = Field(default="entry", pattern="^(entry|mid|senior)$")
    target_role: str = Field(default="Software Engineer", max_length=100)
    question_budget: int = Field(default=5, ge=1, le=15)


class InterviewSessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    category: str
    difficulty: str
    target_role: str
    status: str
    question_budget: int
    current_question_index: int
    overall_score: Optional[float] = None
    summary_feedback: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    questions: List[QuestionResponse] = []

    model_config = ConfigDict(from_attributes=True)
