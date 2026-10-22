import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "InterviewLens AI"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = Field(default="interviewlens-insecure-secret-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = Field(default="sqlite:///./interviewlens.db")
    
    # Storage
    STORAGE_DIR: str = Field(
        default=os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "storage",
            "uploads"
        )
    )
    MAX_UPLOAD_SIZE_BYTES: int = 150 * 1024 * 1024  # 150MB limit
    ALLOWED_VIDEO_EXTENSIONS: List[str] = [".mp4", ".mov", ".webm", ".mkv"]
    ALLOWED_RESUME_EXTENSIONS: List[str] = [".pdf", ".docx", ".txt"]
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    # AI Model Providers
    AI_PROVIDER: str = Field(default="mock")  # mock, openai, gemini, huggingface
    OPENAI_API_KEY: str = Field(default="")
    GEMINI_API_KEY: str = Field(default="")
    WHISPER_MODEL_SIZE: str = Field(default="base")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

# Ensure storage directory exists
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
