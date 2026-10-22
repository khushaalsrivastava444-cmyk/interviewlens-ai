from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ProcessingJobResponse(BaseModel):
    id: str
    video_id: str
    job_type: str
    status: str
    current_step: str
    progress_percent: int
    error_detail: Optional[str] = None
    retry_count: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TranscriptSegmentResponse(BaseModel):
    id: str
    start_time: float
    end_time: float
    text: str
    confidence: Optional[float] = None
    order_index: int

    model_config = ConfigDict(from_attributes=True)


class TranscriptResponse(BaseModel):
    id: str
    video_id: str
    language: str
    full_text: str
    confidence: Optional[float] = None
    provider_name: str
    is_user_edited: bool
    segments: List[TranscriptSegmentResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TranscriptUpdateRequest(BaseModel):
    full_text: str
    segments: Optional[List[dict]] = None


class VideoStatusResponse(BaseModel):
    id: str
    status: str
    current_step: str
    progress_percent: int
    has_audio: bool
    duration_seconds: Optional[float] = None
    error_message: Optional[str] = None
    retry_count: int

    model_config = ConfigDict(from_attributes=True)


class VideoResponse(BaseModel):
    id: str
    user_id: str
    question_id: Optional[str] = None
    filename: str
    original_filename: str
    file_size_bytes: int
    duration_seconds: Optional[float] = None
    mime_type: str
    fps: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    has_audio: bool
    has_thumbnail: bool = False
    has_extracted_audio: bool = False
    status: str
    current_step: str
    progress_percent: int
    retry_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    transcript: Optional[TranscriptResponse] = None
    jobs: List[ProcessingJobResponse] = []

    model_config = ConfigDict(from_attributes=True)
