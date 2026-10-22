from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.security import get_password_hash
from app.database import get_db
from app.models.user import User
from app.models.interview import InterviewSession
from app.schemas.user import UserUpdate, UserResponse

router = APIRouter()


@router.get("/profile", response_model=dict)
def get_user_profile(
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """Get rich user candidate profile and interview summary metrics."""
    sessions = db.query(InterviewSession).filter(InterviewSession.user_id == current_user.id).all()
    completed_sessions = [s for s in sessions if s.status == "completed"]
    avg_score = (
        sum(s.overall_score for s in completed_sessions if s.overall_score is not None) / len(completed_sessions)
        if completed_sessions else 0.0
    )

    return {
        "user": UserResponse.model_validate(current_user),
        "statistics": {
            "total_sessions": len(sessions),
            "completed_sessions": len(completed_sessions),
            "average_score": round(avg_score, 2),
            "categories_practiced": list({s.category for s in sessions})
        }
    }


@router.put("/profile", response_model=UserResponse)
def update_user_profile(
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(get_db)
) -> Any:
    """Update profile information for the authenticated user."""
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.target_role is not None:
        current_user.target_role = user_in.target_role
    if user_in.experience_level is not None:
        current_user.experience_level = user_in.experience_level
    if user_in.password is not None:
        current_user.hashed_password = get_password_hash(user_in.password)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user
