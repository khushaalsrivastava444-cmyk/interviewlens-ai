import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Boolean, Text, Integer, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    video_id = Column(String(36), ForeignKey("uploaded_videos.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    language = Column(String(10), default="en", nullable=False)
    full_text = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)
    provider_name = Column(String(50), default="whisper", nullable=False)
    is_user_edited = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    video = relationship("UploadedVideo", back_populates="transcript")
    segments = relationship("TranscriptSegment", back_populates="transcript", cascade="all, delete-orphan", order_by="TranscriptSegment.order_index")
    evaluations = relationship("Evaluation", back_populates="transcript")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    transcript_id = Column(String(36), ForeignKey("transcripts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    start_time = Column(Float, nullable=False)  # in seconds
    end_time = Column(Float, nullable=False)    # in seconds
    text = Column(Text, nullable=False)
    confidence = Column(Float, nullable=True)
    words_json = Column(JSON, nullable=True)     # optional word-level timestamps
    order_index = Column(Integer, default=0, nullable=False)

    # Relationships
    transcript = relationship("Transcript", back_populates="segments")
