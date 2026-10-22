import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class UploadedVideo(Base):
    __tablename__ = "uploaded_videos"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="SET NULL"), nullable=True, index=True)
    
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    duration_seconds = Column(Float, nullable=True)
    mime_type = Column(String(100), nullable=False)
    storage_path = Column(String(500), nullable=False)
    audio_path = Column(String(500), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)
    checksum_sha256 = Column(String(64), nullable=False)
    
    fps = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    has_audio = Column(Boolean, default=True, nullable=False)
    
    # status: uploaded, processing, completed, failed
    status = Column(String(50), default="uploaded", nullable=False, index=True)
    current_step = Column(String(100), default="uploaded", nullable=False)
    progress_percent = Column(Integer, default=0, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="uploaded_videos")
    question = relationship("Question", back_populates="video")
    transcript = relationship("Transcript", back_populates="video", uselist=False, cascade="all, delete-orphan")
    jobs = relationship("ProcessingJob", back_populates="video", cascade="all, delete-orphan", order_by="ProcessingJob.created_at.desc()")


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    video_id = Column(String(36), ForeignKey("uploaded_videos.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    job_type = Column(String(50), default="video_ingestion", nullable=False)
    # status: pending, processing, completed, failed
    status = Column(String(50), default="pending", nullable=False, index=True)
    current_step = Column(String(100), default="queued", nullable=False)
    progress_percent = Column(Integer, default=0, nullable=False)
    error_detail = Column(Text, nullable=True)
    
    retry_count = Column(Integer, default=0, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    video = relationship("UploadedVideo", back_populates="jobs")
