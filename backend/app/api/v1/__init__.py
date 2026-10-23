from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.health import router as health_router
from app.api.v1.videos import router as videos_router
from app.api.v1.transcripts import router as transcripts_router
from app.api.v1.evaluations import router as evaluations_router
from app.api.v1.audio_analytics import router as audio_router
from app.api.v1.interviews import router as interviews_router
from app.api.v1.resumes import router as resumes_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(videos_router, prefix="/videos", tags=["Videos"])
api_router.include_router(transcripts_router, prefix="/transcripts", tags=["Transcripts"])
api_router.include_router(evaluations_router, prefix="/evaluations", tags=["Evaluations"])
api_router.include_router(audio_router, prefix="/audio-analytics", tags=["Audio Analytics"])
api_router.include_router(interviews_router, prefix="/interviews", tags=["Interviews"])
api_router.include_router(resumes_router, prefix="/resumes", tags=["Resume Intelligence"])
