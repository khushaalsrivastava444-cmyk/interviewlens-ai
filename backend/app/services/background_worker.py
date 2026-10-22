import os
from typing import Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.video import UploadedVideo, ProcessingJob
from app.services.video_service import video_service, VideoProcessingError


def process_video_job(video_id: str, db_session: Optional[Session] = None) -> None:
    """
    Background worker task executing metadata extraction, audio extraction,
    and thumbnail generation with granular progress state persistence.
    Supports dependency injection for testing.
    """
    close_db = False
    if db_session is None:
        db = SessionLocal()
        close_db = True
    else:
        db = db_session

    try:
        video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
        if not video:
            return

        job = (
            db.query(ProcessingJob)
            .filter(ProcessingJob.video_id == video_id)
            .order_by(ProcessingJob.created_at.desc())
            .first()
        )

        # Step 1: Initialize processing
        video.status = "processing"
        video.current_step = "validating_media"
        video.progress_percent = 15
        if job:
            job.status = "processing"
            job.current_step = "validating_media"
            job.progress_percent = 15
        db.commit()

        # Step 2: Inspect metadata using FFprobe
        video.current_step = "inspecting_metadata"
        video.progress_percent = 35
        if job:
            job.current_step = "inspecting_metadata"
            job.progress_percent = 35
        db.commit()

        metadata = video_service.inspect_metadata(video.storage_path)
        video.width = metadata.get("width")
        video.height = metadata.get("height")
        video.fps = metadata.get("fps")
        video.duration_seconds = metadata.get("duration")
        video.has_audio = metadata.get("has_audio", False)
        db.commit()

        # Step 3: Extract Audio via FFmpeg (if audio stream is present)
        if video.has_audio:
            video.current_step = "extracting_audio"
            video.progress_percent = 65
            if job:
                job.current_step = "extracting_audio"
                job.progress_percent = 65
            db.commit()

            storage_dir = os.path.dirname(video.storage_path)
            audio_path = os.path.join(storage_dir, f"{video.id}_audio.wav")
            extracted_path = video_service.extract_audio(video.storage_path, audio_path)
            if extracted_path:
                video.audio_path = extracted_path
                db.commit()

        # Step 4: Sample Frame & Generate Thumbnail via OpenCV
        video.current_step = "sampling_frames"
        video.progress_percent = 85
        if job:
            job.current_step = "sampling_frames"
            job.progress_percent = 85
        db.commit()

        storage_dir = os.path.dirname(video.storage_path)
        thumb_path = os.path.join(storage_dir, f"{video.id}_thumb.jpg")
        thumb_result = video_service.generate_thumbnail(video.storage_path, thumb_path)
        if thumb_result:
            video.thumbnail_path = thumb_result
            db.commit()

        # Step 5: Finalize completion
        video.status = "completed"
        video.current_step = "ready_for_transcription"
        video.progress_percent = 100
        video.error_message = None

        if job:
            job.status = "completed"
            job.current_step = "completed"
            job.progress_percent = 100
            job.error_detail = None
        db.commit()

    except Exception as exc:
        err_msg = str(exc)
        print(f"Error in background processing job for video {video_id}: {err_msg}")
        try:
            video = db.query(UploadedVideo).filter(UploadedVideo.id == video_id).first()
            if video:
                video.status = "failed"
                video.current_step = "processing_failed"
                video.error_message = err_msg
                db.commit()

            job = (
                db.query(ProcessingJob)
                .filter(ProcessingJob.video_id == video_id)
                .order_by(ProcessingJob.created_at.desc())
                .first()
            )
            if job:
                job.status = "failed"
                job.current_step = "failed"
                job.error_detail = err_msg
                db.commit()
        except Exception as e:
            print(f"Failed to record failure state: {e}")

    finally:
        if close_db:
            db.close()
