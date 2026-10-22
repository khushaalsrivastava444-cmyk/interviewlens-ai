import pytest
import subprocess
from typing import Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.core.security import create_access_token
from app.models.user import User
from app.core.security import get_password_hash

# Use in-memory SQLite for high-speed, isolated test execution
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session() -> Generator:
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session) -> Generator:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session) -> User:
    user = User(
        email="candidate@interviewlens.ai",
        hashed_password=get_password_hash("TestSecure123!"),
        full_name="Alex Mercer",
        target_role="Machine Learning Engineer",
        experience_level="entry",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user) -> dict:
    token = create_access_token(subject=test_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def synthetic_video_path(tmp_path_factory) -> str:
    """Generate a 2-second valid synthetic MP4 video with an audio track using FFmpeg."""
    fn = tmp_path_factory.mktemp("media") / "test_sample.mp4"
    path = str(fn)
    
    from app.services.video_service import get_ffmpeg_paths
    ffmpeg_bin, _ = get_ffmpeg_paths()
    cmd = [
        ffmpeg_bin, "-y",
        "-f", "lavfi", "-i", "testsrc=duration=2:size=320x240:rate=30",
        "-f", "lavfi", "-i", "sine=frequency=1000:duration=2",
        "-pix_fmt", "yuv420p",
        "-c:v", "libx264", "-c:a", "aac",
        path
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return path
