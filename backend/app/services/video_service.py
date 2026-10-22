import os
import shutil
import subprocess
import json
import hashlib
from typing import Dict, Any, Optional, Tuple
import cv2
from app.core.config import settings


def get_ffmpeg_paths() -> Tuple[str, str]:
    """Locate ffmpeg and ffprobe executables across system PATH and default directories."""
    ffmpeg_bin = shutil.which("ffmpeg")
    ffprobe_bin = shutil.which("ffprobe")
    
    # Common Windows fallback path if not yet in global session PATH
    win_ffmpeg_dir = r"C:\Users\khush\AppData\Local\Programs\ffmpeg-9.0.2-essentials_build\bin"
    if not ffmpeg_bin and os.path.exists(os.path.join(win_ffmpeg_dir, "ffmpeg.exe")):
        ffmpeg_bin = os.path.join(win_ffmpeg_dir, "ffmpeg.exe")
    if not ffprobe_bin and os.path.exists(os.path.join(win_ffmpeg_dir, "ffprobe.exe")):
        ffprobe_bin = os.path.join(win_ffmpeg_dir, "ffprobe.exe")

    return ffmpeg_bin or "ffmpeg", ffprobe_bin or "ffprobe"


class VideoProcessingError(Exception):
    """Custom exception raised for corrupt, invalid, or unprocessable media files."""
    pass


class VideoService:
    def __init__(self):
        self.ffmpeg_path, self.ffprobe_path = get_ffmpeg_paths()

    def validate_file(self, filename: str, file_size: int, mime_type: str) -> None:
        """Enforce file extension, maximum file size, and MIME type rules."""
        ext = os.path.splitext(filename)[1].lower()
        if ext not in settings.ALLOWED_VIDEO_EXTENSIONS:
            allowed = ", ".join(settings.ALLOWED_VIDEO_EXTENSIONS)
            raise VideoProcessingError(f"Invalid file extension '{ext}'. Allowed formats: {allowed}")

        if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
            max_mb = settings.MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)
            raise VideoProcessingError(f"File size exceeds maximum limit of {max_mb} MB.")

        allowed_mimes = ["video/mp4", "video/quicktime", "video/webm", "video/x-matroska", "application/octet-stream"]
        if mime_type and mime_type.lower() not in allowed_mimes and not mime_type.startswith("video/"):
            raise VideoProcessingError(f"Unsupported MIME type '{mime_type}'. Expected a video format.")

    def compute_sha256(self, file_path: str) -> str:
        """Compute SHA-256 hash in chunks to preserve memory."""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    def inspect_metadata(self, file_path: str) -> Dict[str, Any]:
        """Inspect video streams, audio streams, and durations using ffprobe."""
        if not os.path.exists(file_path):
            raise VideoProcessingError(f"Target media file does not exist: {file_path}")

        cmd = [
            self.ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            file_path,
        ]

        try:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=30)
            if result.returncode != 0:
                raise VideoProcessingError(f"Corrupt or unreadable video file. ffprobe failed: {result.stderr}")
            
            probe_data = json.loads(result.stdout)
        except subprocess.TimeoutExpired:
            raise VideoProcessingError("Media metadata inspection timed out.")
        except json.JSONDecodeError:
            raise VideoProcessingError("Failed to parse media probe metadata.")
        except Exception as e:
            raise VideoProcessingError(f"Could not inspect media file: {str(e)}")

        streams = probe_data.get("streams", [])
        format_info = probe_data.get("format", {})

        video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
        audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)

        if not video_stream:
            raise VideoProcessingError("The uploaded file does not contain a valid video stream.")

        # Extract dimensions
        width = video_stream.get("width")
        height = video_stream.get("height")

        # Extract frame rate
        fps = None
        r_frame_rate = video_stream.get("r_frame_rate", "0/0")
        try:
            num, den = map(float, r_frame_rate.split("/"))
            if den > 0:
                fps = round(num / den, 2)
        except Exception:
            fps = 30.0

        # Extract duration
        duration = None
        if "duration" in format_info:
            try:
                duration = float(format_info["duration"])
            except ValueError:
                pass
        if duration is None and "duration" in video_stream:
            try:
                duration = float(video_stream["duration"])
            except ValueError:
                pass

        return {
            "width": width,
            "height": height,
            "fps": fps,
            "duration": round(duration, 2) if duration else 0.0,
            "has_audio": audio_stream is not None,
            "video_codec": video_stream.get("codec_name"),
            "audio_codec": audio_stream.get("codec_name") if audio_stream else None,
            "size_bytes": int(format_info.get("size", os.path.getsize(file_path))),
        }

    def extract_audio(self, video_path: str, output_wav_path: str) -> Optional[str]:
        """Extract a 16kHz mono 16-bit PCM WAV audio file using FFmpeg."""
        os.makedirs(os.path.dirname(output_wav_path), exist_ok=True)

        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i", video_path,
            "-vn",                     # Disable video
            "-acodec", "pcm_s16le",    # 16-bit PCM WAV
            "-ar", "16000",            # 16kHz sampling rate
            "-ac", "1",                # Mono channel
            output_wav_path,
        ]

        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
            if res.returncode != 0 or not os.path.exists(output_wav_path):
                # No audio or extraction failed
                return None
            return output_wav_path
        except Exception as e:
            print(f"Audio extraction error: {e}")
            return None

    def generate_thumbnail(self, video_path: str, output_thumb_path: str) -> Optional[str]:
        """Capture a sample frame at 1.0 second and save as a preview JPEG using OpenCV."""
        os.makedirs(os.path.dirname(output_thumb_path), exist_ok=True)
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None

        try:
            # Jump to 1 second
            cap.set(cv2.CAP_PROP_POS_MSEC, 1000)
            success, frame = cap.read()
            if not success:
                # Fallback to the first frame
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                success, frame = cap.read()

            if success and frame is not None:
                cv2.imwrite(output_thumb_path, frame)
                return output_thumb_path
            return None
        finally:
            cap.release()

    def delete_media_files(self, video_path: Optional[str], audio_path: Optional[str], thumb_path: Optional[str]) -> None:
        """Securely remove media files from the filesystem."""
        for path in [video_path, audio_path, thumb_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except OSError as e:
                    print(f"Warning: Failed to delete media file {path}: {e}")


video_service = VideoService()
