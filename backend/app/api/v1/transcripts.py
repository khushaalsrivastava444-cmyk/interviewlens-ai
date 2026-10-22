from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.database import get_db
from app.models.user import User
from app.models.video import UploadedVideo
from app.models.transcript import Transcript, TranscriptSegment
from app.models.evaluation import Evaluation
from app.schemas.video import TranscriptResponse, TranscriptUpdateRequest
from app.services.transcription_service import transcription_service

router = APIRouter()


@router.post("/generate/{video_id}", response_model=TranscriptResponse, status_code=status.HTTP_201_CREATED)
def generate_transcript(
    video_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Generate timestamped speech transcript from the extracted video audio track.
    Produces segment-level timestamps for synchronized timeline navigation.
    """
    video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video recording not found.")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this recording.")
    if video.status != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Video is still processing (current status: {video.status}). Please wait for audio extraction to complete."
        )

    # Check if a transcript already exists
    existing = db.query(Transcript).filter(Transcript.video_id == video_id).first()
    if existing:
        return existing

    # Execute speech-to-text inference
    result = transcription_service.transcribe(
        audio_path=video.audio_path or "",
        video_duration=video.duration_seconds or 0.0,
    )

    transcript = Transcript(
        video_id=video.id,
        language=result.language,
        full_text=result.full_text,
        confidence=result.confidence,
        provider_name=result.provider_name,
        is_user_edited=False,
    )
    db.add(transcript)
    db.commit()
    db.refresh(transcript)

    for seg in result.segments:
        segment_row = TranscriptSegment(
            transcript_id=transcript.id,
            start_time=seg.start_time,
            end_time=seg.end_time,
            text=seg.text,
            confidence=seg.confidence,
            words_json=seg.words,
            order_index=seg.order_index,
        )
        db.add(segment_row)

    db.commit()
    db.refresh(transcript)
    return transcript


@router.get("/{video_id}", response_model=TranscriptResponse)
def get_transcript_by_video(
    video_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve timestamped transcript for a video recording."""
    video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video recording not found.")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")

    transcript = db.query(Transcript).filter(Transcript.video_id == video_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript has not been generated yet for this video.")

    return transcript


@router.put("/{transcript_id}", response_model=TranscriptResponse)
def update_transcript(
    transcript_id: str,
    update_data: TranscriptUpdateRequest,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Allow candidate to correct transcription errors before finalizing rubric assessment.
    Marks any prior evaluations as stale so candidate can request re-evaluation.
    """
    transcript = db.query(Transcript).filter(Transcript.id == transcript_id).first()
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found.")
    
    video = db.query(UploadedVideo).filter(UploadedVideo.id == transcript.video_id).first()
    if not video or video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this transcript.")

    transcript.full_text = update_data.full_text
    transcript.is_user_edited = True

    # Mark existing evaluations as stale
    evaluations = db.query(Evaluation).filter(Evaluation.transcript_id == transcript.id).all()
    for ev in evaluations:
        ev.is_stale = True

    db.commit()
    db.refresh(transcript)
    return transcript
