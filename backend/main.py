"""
InterviewLens AI — Backend Service Entrypoint
Exposes the FastAPI application instance for Vercel Python runtime and ASGI servers.
"""
import sys
import os

# Ensure the backend root is in the Python module search path
backend_root = os.path.dirname(os.path.abspath(__file__))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.main import app

__all__ = ["app"]
