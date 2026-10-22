from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint verifying database connectivity."""
    db_healthy = True
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_healthy = False
        db_error = str(e)
    else:
        db_error = None

    return {
        "status": "healthy" if db_healthy else "degraded",
        "service": "InterviewLens AI API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": {
            "connected": db_healthy,
            "error": db_error
        }
    }
