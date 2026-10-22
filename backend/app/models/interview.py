import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Text, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    
    # 10 Supported Categories:
    # python, dsa, sql_dbms, data_science_stats, ml_dl, nlp_llm_rag, mlops, backend_sys_design, resume_defense, behavioral
    category = Column(String(100), nullable=False, index=True)
    difficulty = Column(String(50), default="entry", nullable=False)  # entry, mid, senior
    target_role = Column(String(100), default="Software Engineer", nullable=False)
    
    status = Column(String(50), default="created", nullable=False)  # created, in_progress, completed
    question_budget = Column(Integer, default=5, nullable=False)
    current_question_index = Column(Integer, default=0, nullable=False)
    
    overall_score = Column(Float, nullable=True)
    summary_feedback = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="interview_sessions")
    questions = relationship("Question", back_populates="session", cascade="all, delete-orphan", order_by="Question.order_index")
    evaluations = relationship("Evaluation", back_populates="session", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    session_id = Column(String(36), ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_question_id = Column(String(36), ForeignKey("questions.id", ondelete="SET NULL"), nullable=True)
    
    question_text = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    difficulty = Column(String(50), default="entry", nullable=False)
    
    # initial, clarification, conceptual_depth, practical_application, debugging, edge_cases, trade_offs, system_design, project_defense
    question_type = Column(String(50), default="initial", nullable=False)
    follow_up_reason = Column(Text, nullable=True)
    
    expected_competencies = Column(JSON, default=list, nullable=False)
    rubric = Column(JSON, default=dict, nullable=False)
    order_index = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    session = relationship("InterviewSession", back_populates="questions")
    parent_question = relationship("Question", remote_side=[id], backref="follow_ups")
    video = relationship("UploadedVideo", back_populates="question", uselist=False)
    evaluations = relationship("Evaluation", back_populates="question", cascade="all, delete-orphan")
