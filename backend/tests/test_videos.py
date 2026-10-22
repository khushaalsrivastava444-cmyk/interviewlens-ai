import os
import subprocess
import pytest
import io
from app.models.video import UploadedVideo
from app.services.background_worker import process_video_job





def test_upload_video_invalid_extension(client, auth_headers):
    data = {"file": ("malicious.exe", io.BytesIO(b"fake executable data"), "application/octet-stream")}
    response = client.post("/api/v1/videos/upload", headers=auth_headers, files=data)
    assert response.status_code == 400
    assert "Invalid file extension" in response.json()["detail"]


def test_upload_video_corrupt_file(client, auth_headers, db_session):
    # Uploading a file ending in .mp4 but containing random garbage
    data = {"file": ("corrupt.mp4", io.BytesIO(b"not a valid video bitstream"), "video/mp4")}
    response = client.post("/api/v1/videos/upload", headers=auth_headers, files=data)
    assert response.status_code in [400, 202]
    if response.status_code == 202:
        # Background worker must mark it as failed
        vid_id = response.json()["id"]
        process_video_job(vid_id, db_session)
        status_res = client.get(f"/api/v1/videos/{vid_id}/status", headers=auth_headers)
        assert status_res.status_code == 200
        assert status_res.json()["status"] == "failed"


def test_upload_valid_video_and_process(client, auth_headers, synthetic_video_path, db_session):
    with open(synthetic_video_path, "rb") as f:
        file_bytes = f.read()

    data = {"file": ("sample_interview.mp4", io.BytesIO(file_bytes), "video/mp4")}
    response = client.post("/api/v1/videos/upload", headers=auth_headers, files=data)
    assert response.status_code == 202
    vid_data = response.json()
    assert vid_data["status"] == "uploaded"
    assert vid_data["progress_percent"] == 5
    video_id = vid_data["id"]

    # Execute background worker synchronously with db_session
    process_video_job(video_id, db_session)

    # Verify status transition to completed
    status_res = client.get(f"/api/v1/videos/{video_id}/status", headers=auth_headers)
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["status"] == "completed"
    assert status_data["progress_percent"] == 100
    assert status_data["has_audio"] is True
    assert status_data["duration_seconds"] > 0

    # Verify video details
    detail_res = client.get(f"/api/v1/videos/{video_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["width"] == 320
    assert detail["height"] == 240
    assert detail["fps"] == 30.0
    assert detail["has_extracted_audio"] is True
    assert detail["has_thumbnail"] is True
    assert len(detail["jobs"]) >= 1


def test_stream_video(client, auth_headers, synthetic_video_path):
    with open(synthetic_video_path, "rb") as f:
        file_bytes = f.read()

    data = {"file": ("stream_test.mp4", io.BytesIO(file_bytes), "video/mp4")}
    upload_res = client.post("/api/v1/videos/upload", headers=auth_headers, files=data)
    video_id = upload_res.json()["id"]

    # Test full video stream
    res = client.get(f"/api/v1/videos/{video_id}/stream", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.content) == len(file_bytes)

    # Test HTTP 206 Partial Content (range header)
    headers = {**auth_headers, "Range": "bytes=0-100"}
    range_res = client.get(f"/api/v1/videos/{video_id}/stream", headers=headers)
    assert range_res.status_code == 206
    assert "Content-Range" in range_res.headers
    assert len(range_res.content) == 101


def test_video_ownership_authorization(client, auth_headers, synthetic_video_path, db_session):
    # Upload as test_user
    with open(synthetic_video_path, "rb") as f:
        file_bytes = f.read()
    data = {"file": ("auth_test.mp4", io.BytesIO(file_bytes), "video/mp4")}
    upload_res = client.post("/api/v1/videos/upload", headers=auth_headers, files=data)
    video_id = upload_res.json()["id"]

    # Register second user and attempt to access test_user's video
    user2_payload = {
        "email": "intruder@example.com",
        "password": "Password123!",
        "full_name": "Intruder User",
        "target_role": "Hacker",
        "experience_level": "entry"
    }
    reg_res = client.post("/api/v1/auth/register", json=user2_payload)
    user2_token = reg_res.json()["access_token"]
    user2_headers = {"Authorization": f"Bearer {user2_token}"}

    forbidden_res = client.get(f"/api/v1/videos/{video_id}", headers=user2_headers)
    assert forbidden_res.status_code == 403

    forbidden_stream = client.get(f"/api/v1/videos/{video_id}/stream", headers=user2_headers)
    assert forbidden_stream.status_code == 403


def test_retry_and_delete_video(client, auth_headers, synthetic_video_path):
    with open(synthetic_video_path, "rb") as f:
        file_bytes = f.read()
    data = {"file": ("delete_test.mp4", io.BytesIO(file_bytes), "video/mp4")}
    upload_res = client.post("/api/v1/videos/upload", headers=auth_headers, files=data)
    video_id = upload_res.json()["id"]

    # Test retry
    retry_res = client.post(f"/api/v1/videos/{video_id}/retry", headers=auth_headers)
    assert retry_res.status_code == 200
    assert retry_res.json()["retry_count"] == 1

    # Test deletion
    delete_res = client.delete(f"/api/v1/videos/{video_id}", headers=auth_headers)
    assert delete_res.status_code == 204

    # Verify it no longer exists
    not_found_res = client.get(f"/api/v1/videos/{video_id}", headers=auth_headers)
    assert not_found_res.status_code == 404
