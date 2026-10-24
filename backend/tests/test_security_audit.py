import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from app.core.config import settings
from app.core.security_middleware import assert_safe_path, rate_limiter


def test_security_headers_present(client: TestClient):
    """Verify security hardening headers are injected on API responses."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_path_traversal_protection():
    """Verify path traversal outside storage directory raises 403."""
    # Malicious relative path escaping base dir
    malicious_path = f"{settings.STORAGE_DIR}/../../../../etc/passwd"
    with pytest.raises(HTTPException) as exc_info:
        assert_safe_path(malicious_path, settings.STORAGE_DIR)
    assert exc_info.value.status_code == 403

    # Safe legitimate subpath
    safe_path = f"{settings.STORAGE_DIR}/legitimate_video.mp4"
    result = assert_safe_path(safe_path, settings.STORAGE_DIR)
    assert result.endswith("legitimate_video.mp4")


def test_rate_limiter_throttling():
    """Verify rate limiter blocks client when threshold is exceeded."""
    test_ip = "192.168.100.99"
    # Auth limit is 30 per minute
    for _ in range(30):
        allowed, _ = rate_limiter.check_rate_limit(test_ip, "/api/v1/auth/login-json")
        assert allowed is True

    # 31st request should be throttled
    blocked, retry_after = rate_limiter.check_rate_limit(test_ip, "/api/v1/auth/login-json")
    assert blocked is False
    assert retry_after > 0


def test_cors_preflight(client: TestClient):
    """Verify CORS preflight headers on allowed origins."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
    }
    response = client.options("/api/v1/auth/login-json", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
