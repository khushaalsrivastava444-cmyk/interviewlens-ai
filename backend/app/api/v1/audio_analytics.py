from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.database import get_db
from app.models.user import User
from app.models.video import UploadedVideo
from app.models.transcript import Transcript
from app.services.audio_analytics import audio_analytics_engine

router = APIRouter()


@router.get("/analyze/{video_id}")
def analyze_video_audio(
    video_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Directly calculate acoustic and lexical speaking metrics for a video recording.
    Returns WPM, filler words, pause frequency, long pauses, and silence ratio.
    """
    video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video recording not found.")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    transcript = db.query(Transcript).filter(Transcript.video_id == video.id).first()
    text = transcript.full_text if transcript else ""

    metrics = audio_analytics_engine.compute_metrics(
        transcript_text=text,
        audio_path=video.audio_path,
        override_duration=video.duration_seconds
    )

    return {
        "video_id": video.id,
        "filename": video.original_filename,
        "metrics": metrics
    }
