import io
import pytest
from fastapi.testclient import TestClient
from app.services.resume_service import resume_intelligence_service
from app.models.user import User
from app.core.security import get_password_hash, create_access_token

SAMPLE_RESUME_TEXT = """
Alex Mercer
alex.mercer@example.com | (555) 234-5678 | San Francisco, CA

SUMMARY
Senior ML Engineer with 4+ years of experience designing and deploying scalable deep learning pipelines, RAG systems, and distributed backend microservices.

SKILLS
Languages: Python, SQL, TypeScript, Bash, C++
ML & Frameworks: PyTorch, TensorFlow, Scikit-learn, Pandas, NumPy, Hugging Face
NLP & LLMs: Transformers, RAG, LangChain, Vector DB, FAISS, Embeddings
Data & Backend: PostgreSQL, Redis, Kafka, FastAPI, Docker, Kubernetes, AWS, CI/CD

PROJECTS
InterviewLens AI | Python, FastAPI, PyTorch, Next.js, Redis
- Designed and built multimodal AI mock interview coach analyzing audio acoustics and candidate transcripts.
- Reduced inference latency by 45% using ONNX runtime and caching frequent embedding lookups in Redis.
- Implemented stateful adaptive question generation engine supporting 10 distinct technical categories.

Dense Passage Retrieval Search Engine | PyTorch, Transformers, FAISS, PostgreSQL
- Built hybrid neural search pipeline indexing over 2 million technical documents with 94.2% top-5 recall.
- Optimized vector similarity search throughput to 1200 QPS with sub-25ms response latency under peak load.

EXPERIENCE
Machine Learning Engineer | NovaAI Systems | 2022 - Present
- Deployed real-time recommendation models serving 500k daily active users on AWS Kubernetes.

EDUCATION
B.S. in Computer Science | University of California, Berkeley | 2018 - 2022
"""


def test_resume_service_extract_skills():
    skills, by_cat = resume_intelligence_service.extract_skills(SAMPLE_RESUME_TEXT)
    assert "python" in skills
    assert "pytorch" in skills
    assert "fastapi" in skills
    assert "rag" in skills
    assert "postgresql" in skills
    assert "redis" in skills
    assert "docker" in skills

    assert "languages" in by_cat
    assert "ml_dl" in by_cat
    assert "nlp_llm_rag" in by_cat
    assert "backend_cloud" in by_cat


def test_resume_service_extract_projects():
    projects = resume_intelligence_service.extract_projects(SAMPLE_RESUME_TEXT)
    assert len(projects) >= 2

    first_p = projects[0]
    assert "InterviewLens" in first_p.name
    assert any("python" in t.lower() for t in first_p.technologies)
    assert len(first_p.metrics) > 0  # should capture "45%"


def test_resume_service_generate_defense_questions():
    projects = resume_intelligence_service.extract_projects(SAMPLE_RESUME_TEXT)
    defense_questions = resume_intelligence_service.generate_project_defense_questions(projects)

    assert len(defense_questions) >= 3
    # Check that questions target architectural trade-offs and bottlenecks
    q_texts = [q.question_text.lower() for q in defense_questions]
    assert any("trade-off" in t or "baseline" in t for t in q_texts)
    assert any("bottleneck" in t or "profile" in t for t in q_texts)


def test_resume_service_match_job_description():
    jd = """
    We are seeking a Machine Learning Engineer to join our Core GenAI team.
    Requirements:
    - Strong proficiency in Python and SQL.
    - Deep hands-on experience with PyTorch, Transformers, and Hugging Face.
    - Experience building RAG pipelines, Vector DBs, and fine-tuning embeddings.
    - Solid backend skills with FastAPI, Docker, and Snowflake.
    - Familiarity with Snowflake, Go, and Kubernetes.
    """
    resume_skills, _ = resume_intelligence_service.extract_skills(SAMPLE_RESUME_TEXT)
    match_result = resume_intelligence_service.match_job_description(resume_skills, jd)

    assert match_result.match_score > 60.0
    assert "python" in match_result.matched_skills
    assert "pytorch" in match_result.matched_skills
    assert "transformers" in match_result.matched_skills
    # 'snowflake' is in JD but not in sample resume
    assert "snowflake" in match_result.missing_critical_skills
    assert len(match_result.ats_recommendations) > 0


def test_resume_upload_and_api_flow(client: TestClient, auth_headers: dict):
    # 1. Upload Resume as .txt
    resume_file = io.BytesIO(SAMPLE_RESUME_TEXT.encode("utf-8"))
    upload_res = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("alex_mercer_resume.txt", resume_file, "text/plain")},
        headers=auth_headers,
    )
    assert upload_res.status_code == 201
    resume_data = upload_res.json()
    resume_id = resume_data["id"]

    assert resume_data["filename"] == "alex_mercer_resume.txt"
    assert "python" in resume_data["parsed_skills"]
    assert len(resume_data["parsed_projects"]) >= 2

    # 2. Retrieve Latest Resume
    latest_res = client.get("/api/v1/resumes/latest", headers=auth_headers)
    assert latest_res.status_code == 200
    assert latest_res.json()["id"] == resume_id

    # 3. Match against target Job Description
    jd_payload = {
        "job_description_text": (
            "Looking for Senior Python ML Engineer with PyTorch, Transformers, "
            "FastAPI, Docker, Snowflake, and Kubernetes experience."
        ),
        "target_role": "Senior Machine Learning Engineer",
    }
    match_res = client.post(
        f"/api/v1/resumes/{resume_id}/match-jd",
        json=jd_payload,
        headers=auth_headers,
    )
    assert match_res.status_code == 200
    match_data = match_res.json()
    assert match_data["match_score"] > 50.0
    assert "snowflake" in match_data["missing_critical_skills"]

    # 4. Generate Project Defense Questions
    defense_res = client.get(
        f"/api/v1/resumes/{resume_id}/project-defense-questions",
        headers=auth_headers,
    )
    assert defense_res.status_code == 200
    defense_data = defense_res.json()
    assert len(defense_data["questions"]) >= 3
    assert defense_data["resume_id"] == resume_id

    # 5. Generate Personalized Learning Plan
    plan_payload = {
        "target_role": "Senior Machine Learning Engineer",
        "job_description_text": jd_payload["job_description_text"],
    }
    plan_res = client.post(
        f"/api/v1/resumes/{resume_id}/generate-practice-plan",
        json=plan_payload,
        headers=auth_headers,
    )
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    plan_id = plan_data["id"]
    assert plan_data["target_role"] == "Senior Machine Learning Engineer"
    assert len(plan_data["milestones"]) == 3
    assert len(plan_data["practice_questions"]) > 0

    # 6. List All Learning Plans
    list_plans_res = client.get("/api/v1/resumes/practice-plans/all", headers=auth_headers)
    assert list_plans_res.status_code == 200
    plans_list = list_plans_res.json()
    assert len(plans_list) >= 1
    assert plans_list[0]["id"] == plan_id


def test_resume_unauthorized_access(client: TestClient, auth_headers: dict, db_session):
    # User 1 uploads resume
    resume_file = io.BytesIO(SAMPLE_RESUME_TEXT.encode("utf-8"))
    upload_res = client.post(
        "/api/v1/resumes/upload",
        files={"file": ("resume_user1.txt", resume_file, "text/plain")},
        headers=auth_headers,
    )
    assert upload_res.status_code == 201
    resume_id = upload_res.json()["id"]

    # User 2 logs in
    user2 = User(
        email="unauthorized_seeker@interviewlens.ai",
        hashed_password=get_password_hash("Secret123!"),
        full_name="Other Candidate",
        is_active=True,
    )
    db_session.add(user2)
    db_session.commit()
    db_session.refresh(user2)
    user2_token = create_access_token(subject=user2.id)
    user2_headers = {"Authorization": f"Bearer {user2_token}"}

    # User 2 attempts to access User 1's resume
    get_res = client.get(f"/api/v1/resumes/{resume_id}", headers=user2_headers)
    assert get_res.status_code == 403

    # User 2 attempts to match JD against User 1's resume
    match_res = client.post(
        f"/api/v1/resumes/{resume_id}/match-jd",
        json={"job_description_text": "Need python engineer with 5 years experience."},
        headers=user2_headers,
    )
    assert match_res.status_code == 403
