import os
import uuid
import re
from typing import List, Optional, Any
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
    status,
    Request,
    Response,
)
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.core.config import settings
from app.database import get_db
from app.models.user import User
from app.models.video import UploadedVideo, ProcessingJob
from app.schemas.video import VideoResponse, VideoStatusResponse, ProcessingJobResponse
from app.services.video_service import video_service, VideoProcessingError
from app.services.background_worker import process_video_job
from app.core.security_middleware import assert_safe_path

router = APIRouter()


@router.post("/upload", response_model=VideoStatusResponse, status_code=status.HTTP_202_ACCEPTED)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    question_id: Optional[str] = Form(None),
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Securely upload an interview response video.
    Validates file integrity, saves to private storage, registers database job,
    and enqueues background processing.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename cannot be empty.")

    original_filename = os.path.basename(file.filename)
    clean_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", original_filename)
    video_id = str(uuid.uuid4())
    stored_filename = f"{video_id}_{clean_name}"
    storage_path = os.path.join(settings.STORAGE_DIR, stored_filename)

    # Stream file to storage while tracking size
    total_bytes = 0
    try:
        with open(storage_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                total_bytes += len(chunk)
                if total_bytes > settings.MAX_UPLOAD_SIZE_BYTES:
                    # Clean up partial upload before raising
                    f.close()
                    if os.path.exists(storage_path):
                        os.remove(storage_path)
                    max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
                    raise HTTPException(
                        status_code=413,
                        detail=f"Video file exceeds size limit of {max_mb} MB.",
                    )
                f.write(chunk)
    except Exception as e:
        if os.path.exists(storage_path):
            os.remove(storage_path)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Failed to write media stream: {str(e)}")

    # Validate file type and compute SHA-256
    try:
        video_service.validate_file(original_filename, total_bytes, file.content_type or "")
        checksum = video_service.compute_sha256(storage_path)
    except VideoProcessingError as e:
        if os.path.exists(storage_path):
            os.remove(storage_path)
        raise HTTPException(status_code=400, detail=str(e))

    # Persist video and processing job record
    video = UploadedVideo(
        id=video_id,
        user_id=current_user.id,
        question_id=question_id,
        filename=stored_filename,
        original_filename=original_filename,
        file_size_bytes=total_bytes,
        mime_type=file.content_type or "video/mp4",
        storage_path=storage_path,
        checksum_sha256=checksum,
        status="uploaded",
        current_step="queued_for_processing",
        progress_percent=5,
    )
    db.add(video)

    job = ProcessingJob(
        video_id=video_id,
        user_id=current_user.id,
        job_type="video_ingestion",
        status="pending",
        current_step="queued",
        progress_percent=5,
    )
    db.add(job)
    db.commit()
    db.refresh(video)

    # Enqueue background processing
    background_tasks.add_task(process_video_job, video_id)

    return VideoStatusResponse(
        id=video.id,
        status=video.status,
        current_step=video.current_step,
        progress_percent=video.progress_percent,
        has_audio=video.has_audio,
        duration_seconds=video.duration_seconds,
        error_message=video.error_message,
        retry_count=video.retry_count,
    )


@router.get("", response_model=List[VideoResponse])
def list_user_videos(
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """List all uploaded videos belonging to the authenticated candidate."""
    videos = (
        db.query(UploadedVideo)
        .filter(UploadedVideo.user_id == current_user.id)
        .order_by(UploadedVideo.created_at.desc())
        .all()
    )
    results = []
    for v in videos:
        res = VideoResponse.model_validate(v)
        res.has_thumbnail = bool(v.thumbnail_path and os.path.exists(v.thumbnail_path))
        res.has_extracted_audio = bool(v.audio_path and os.path.exists(v.audio_path))
        results.append(res)
    return results


@router.get("/{video_id}", response_model=VideoResponse)
def get_video_details(
    video_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve full video metadata, processing state, and job history."""
    video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video recording not found.")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this video.")

    response = VideoResponse.model_validate(video)
    response.has_thumbnail = bool(video.thumbnail_path and os.path.exists(video.thumbnail_path))
    response.has_extracted_audio = bool(video.audio_path and os.path.exists(video.audio_path))
    return response


@router.get("/{video_id}/status", response_model=VideoStatusResponse)
def get_video_status(
    video_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Lightweight polling endpoint to track video processing progress."""
    video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video recording not found.")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view status.")

    return VideoStatusResponse(
        id=video.id,
        status=video.status,
        current_step=video.current_step,
        progress_percent=video.progress_percent,
        has_audio=video.has_audio,
        duration_seconds=video.duration_seconds,
        error_message=video.error_message,
        retry_count=video.retry_count,
    )


@router.get("/{video_id}/stream")
def stream_video(
    video_id: str,
    request: Request,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Secure video streaming endpoint with HTTP 206 Partial Content support,
    allowing scrubbing and native HTML5 video player playback.
    """
    video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video recording not found.")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to stream this video.")
    if not os.path.exists(video.storage_path):
        raise HTTPException(status_code=404, detail="Video file does not exist on disk.")

    safe_video_path = assert_safe_path(video.storage_path, settings.STORAGE_DIR)
    file_size = os.path.getsize(safe_video_path)
    range_header = request.headers.get("range")

    if not range_header:
        return FileResponse(
            safe_video_path,
            media_type=video.mime_type,
            filename=video.original_filename,
        )

    # Parse Range header: bytes=start-end
    range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if not range_match:
        return FileResponse(safe_video_path, media_type=video.mime_type)

    start = int(range_match.group(1))
    end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
    if start >= file_size:
        raise HTTPException(status_code=416, detail="Requested range not satisfiable.")
    
    length = end - start + 1

    def iterfile():
        with open(safe_video_path, "rb") as f:
            f.seek(start)
            bytes_left = length
            chunk_size = 64 * 1024
            while bytes_left > 0:
                read_amount = min(chunk_size, bytes_left)
                data = f.read(read_amount)
                if not data:
                    break
                bytes_left -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(length),
        "Content-Type": video.mime_type,
    }

    return StreamingResponse(iterfile(), status_code=206, headers=headers)


@router.get("/{video_id}/audio")
def stream_audio(
    video_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
):
    """Stream extracted WAV audio track for speech analysis and playback."""
    video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video recording not found.")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
    if not video.audio_path or not os.path.exists(video.audio_path):
        raise HTTPException(status_code=404, detail="Extracted audio track not found.")

    safe_audio_path = assert_safe_path(video.audio_path, settings.STORAGE_DIR)
    return FileResponse(safe_audio_path, media_type="audio/wav")


@router.get("/{video_id}/thumbnail")
def get_thumbnail(
    video_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
):
    """Retrieve JPEG thumbnail sampled at 1s."""
    video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video recording not found.")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized.")
    if not video.thumbnail_path or not os.path.exists(video.thumbnail_path):
        raise HTTPException(status_code=404, detail="Thumbnail not available.")

    safe_thumb_path = assert_safe_path(video.thumbnail_path, settings.STORAGE_DIR)
    return FileResponse(safe_thumb_path, media_type="image/jpeg")


@router.post("/{video_id}/retry", response_model=VideoStatusResponse)
def retry_processing(
    video_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
) -> Any:
    """Retry a failed video processing job."""
    video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video recording not found.")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to retry.")

    video.status = "uploaded"
    video.current_step = "retry_queued"
    video.progress_percent = 5
    video.retry_count += 1
    video.error_message = None

    job = ProcessingJob(
        video_id=video_id,
        user_id=current_user.id,
        job_type="video_ingestion_retry",
        status="pending",
        current_step="queued",
        progress_percent=5,
        retry_count=video.retry_count,
    )
    db.add(job)
    db.commit()
    db.refresh(video)

    background_tasks.add_task(process_video_job, video_id)

    return VideoStatusResponse(
        id=video.id,
        status=video.status,
        current_step=video.current_step,
        progress_percent=video.progress_percent,
        has_audio=video.has_audio,
        duration_seconds=video.duration_seconds,
        error_message=video.error_message,
        retry_count=video.retry_count,
    )


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(
    video_id: str,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Candidate-controlled deletion.
    Permanently cleans up video file, extracted audio, thumbnail, and DB records.
    """
    video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video recording not found.")
    if video.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this video.")

    # Remove files
    video_service.delete_media_files(video.storage_path, video.audio_path, video.thumbnail_path)

    # Delete database record
    db.delete(video)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
