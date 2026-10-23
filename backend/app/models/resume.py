import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    extracted_text = Column(Text, nullable=False)
    
    parsed_skills = Column(JSON, default=list, nullable=False)
    parsed_projects = Column(JSON, default=list, nullable=False)
    parsed_experience = Column(JSON, default=list, nullable=False)
    parsed_education = Column(JSON, default=list, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="resumes")


class LearningPlan(Base):
    __tablename__ = "learning_plans"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="SET NULL"), nullable=True)
    
    target_role = Column(String(100), nullable=False)
    identified_gaps = Column(JSON, default=list, nullable=False)
    recommended_topics = Column(JSON, default=list, nullable=False)
    practice_questions = Column(JSON, default=list, nullable=False)
    milestones = Column(JSON, default=list, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="learning_plans")
