import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True)
    transcript_id = Column(String(36), ForeignKey("transcripts.id", ondelete="SET NULL"), nullable=True)

    overall_score = Column(Float, nullable=False)
    maximum_score = Column(Float, default=5.0, nullable=False)
    
    strengths = Column(JSON, default=list, nullable=False)
    missing_concepts = Column(JSON, default=list, nullable=False)
    criteria_scores = Column(JSON, default=list, nullable=False)
    recommended_follow_up = Column(Text, nullable=True)
    
    # Measurable speaking analytics (deterministic Python calculations)
    speaking_metrics = Column(JSON, nullable=True)
    
    # Interactive video timeline markers (strengths, gaps, hesitations with timestamps)
    timeline_markers = Column(JSON, default=list, nullable=True)
    
    # Optional frame visual analytics
    visual_metrics = Column(JSON, nullable=True)
    
    model_name = Column(String(100), default="rule_based_llm_v1", nullable=False)
    rubric_version = Column(String(20), default="1.0", nullable=False)
    is_stale = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    session = relationship("InterviewSession", back_populates="evaluations")
    question = relationship("Question", back_populates="evaluations")
    transcript = relationship("Transcript", back_populates="evaluations")
