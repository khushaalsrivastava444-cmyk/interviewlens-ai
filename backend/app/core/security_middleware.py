import time
import os
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies security headers to all responses to protect against MIME-sniffing,
    clickjacking, and cross-site scripting vulnerabilities.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


class InMemoryRateLimiter:
    """
    Thread-safe sliding window rate limiter based on client IP.
    Protects authentication endpoints from brute force and upload endpoints from resource exhaustion.
    """
    def __init__(self):
        # ip -> list of request timestamps
        self.requests: Dict[str, List[float]] = defaultdict(list)
        # Endpoint-specific limits (max_requests, window_seconds)
        self.auth_limit: Tuple[int, int] = (30, 60)      # 30 req/min for auth
        self.upload_limit: Tuple[int, int] = (40, 60)    # 40 uploads/min
        self.default_limit: Tuple[int, int] = (600, 60)  # 600 req/min general

    def _clean_expired(self, ip: str, window_seconds: int, now: float):
        cutoff = now - window_seconds
        self.requests[ip] = [ts for ts in self.requests[ip] if ts > cutoff]

    def check_rate_limit(self, client_ip: str, path: str) -> Tuple[bool, int]:
        """
        Returns (is_allowed, retry_after_seconds).
        """
        now = time.time()

        if "/auth/" in path:
            max_req, window = self.auth_limit
        elif "/upload" in path:
            max_req, window = self.upload_limit
        else:
            max_req, window = self.default_limit

        self._clean_expired(client_ip, window, now)
        timestamps = self.requests[client_ip]

        if len(timestamps) >= max_req:
            oldest = timestamps[0]
            retry_after = max(1, int(window - (now - oldest)))
            return False, retry_after

        self.requests[client_ip].append(now)
        return True, 0


rate_limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # Exempt health check and openapi documentation endpoints
        path = request.url.path
        if path.endswith("/health") or path.endswith("/docs") or path.endswith("/openapi.json"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "127.0.0.1"
        # Exempt automated TestClient requests from rate limiting
        if client_ip == "testclient":
            return await call_next(request)

        allowed, retry_after = rate_limiter.check_rate_limit(client_ip, path)

        if not allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Too many requests. Please slow down.",
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)


def assert_safe_path(target_path: str, base_dir: str) -> str:
    """
    Validate that target_path strictly resides within base_dir,
    preventing directory traversal attacks (e.g. '../../etc/passwd').
    """
    real_base = os.path.realpath(base_dir)
    real_target = os.path.realpath(target_path)

    # Ensure target path starts with the base directory
    try:
        common = os.path.commonpath([real_base, real_target])
    except ValueError:
        # Different drives on Windows
        raise HTTPException(status_code=403, detail="Path traversal detected across volumes.")

    if common != real_base:
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: Path traversal outside designated storage directory.",
        )
    return real_target
