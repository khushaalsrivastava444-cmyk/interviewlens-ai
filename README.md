# InterviewLens AI — Multimodal AI Mock Interview Coach

> **Production-Oriented Student Portfolio Project**  
> Analyzes recorded technical interview responses, generates timestamped transcripts, computes digital signal processing (DSP) speaking metrics, evaluates answers against question-specific rubrics, generates adaptive follow-up questions, parses resumes for ATS job alignment, and grounds responses using Hybrid RAG with automated calibration.

---

## 1. System Architecture Overview

InterviewLens AI is designed as a **clean, modular monolith** aligning with production best practices:
- **Presentation Layer**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Recharts for radar/bar analytics, Lucide icons.
- **API & Orchestration Layer**: FastAPI with versioned `/api/v1` routes, Pydantic v2 schemas for strict contract enforcement, OAuth2 JWT authentication with bcrypt password hashing.
- **Persistence & Migration Layer**: SQLAlchemy 2.0 with PostgreSQL + `pgvector` in production and SQLite zero-dependency local development fallback; Alembic for database version migrations.
- **Media & Processing Pipeline**: FFmpeg & FFprobe media inspection and 16kHz WAV extraction, OpenCV 1.0s thumbnail sampling, SHA-256 integrity checks, and secure HTTP 206 Partial Content streaming.
- **Deterministic Audio Analytics**: SciPy 50ms sliding-window RMS silence ratio, pause frequency (>1.5s), boundary-aware multi-phrase filler word detection, and conversational WPM calculation.
- **Rubric-Based Evaluation**: 10 category technical rubrics with timestamped evidence extraction and missing concept gap detection.
- **Adaptive Follow-Up Engine**: Dynamic stateful mock interview session orchestrator with question budgeting and automated session synthesis.
- **Interactive Video Timeline**: Clickable colored markers (strengths vs hesitations) that seek the video player to exact moments with quote inspection.
- **Resume Intelligence & ATS Matching**: Multi-format parser (PDF/DOCX/TXT), 6-domain skills taxonomy, project metric extraction, ATS job matching, project defense question generation, and 3-phase practice plans.
- **Hybrid RAG & pgvector Knowledge Retrieval**: Sublinear TF-IDF vector embeddings combined with sparse lexical matching, authoritative reference corpus across 8 domains, and factual grounding.
- **Automated Scoring Benchmark & Calibration**: 3 competency tiers (High, Medium, Low) verifying 100% score monotonicity and sub-15ms evaluation latency.
- **Security Hardening**: Security headers, IP sliding-window rate limiting, and canonicalized path traversal protection.

For full architectural deep dive and interview talking points, see [ARCHITECTURE.md](file:///C:/Users/khush/.gemini/antigravity/scratch/interviewlens-ai/ARCHITECTURE.md).

---

## 2. Supported Interview Domains (10 Categories)

1. **Python & Programming Fundamentals** (GIL, CPython memory lifecycle, generators, asyncio)
2. **Data Structures & Algorithms** (B-trees, hash collision resolution, load factor rehashing)
3. **SQL & Relational DBMS** (Query optimization, sequential vs index scan cost, ACID transactions)
4. **Data Science & Applied Statistics** (Hypothesis testing, PR-AUC vs ROC-AUC on imbalanced datasets)
5. **Machine Learning & Deep Learning** (Data leakage in feature scaling, cross-validation, regularization)
6. **NLP, Transformers, LLMs & RAG** (Sliding window chunking, dense bi-encoder embeddings, hallucination grounding)
7. **ML Engineering & MLOps** (Covariate data drift vs concept drift, latency SLAs, model monitoring)
8. **Backend & System Design** (Cache-aside pattern, cache stampede mitigation, CAP theorem, horizontal scaling)
9. **Resume & Project Defense** (Baseline benchmarking, profiling bottlenecks, production failovers)
10. **Behavioral & HR** (STAR framework structure, leadership ownership, retrospective improvements)

---

## 3. Technology Stack

### Backend
- **Python 3.12**
- **FastAPI** (Async REST API router)
- **Pydantic v2** (Strict data validation)
- **SQLAlchemy 2.0** (Database ORM)
- **Alembic** (Database migrations)
- **PostgreSQL + pgvector** (Production database & vector search)
- **SQLite** (Local zero-dependency testing fallback)
- **Bcrypt & Python-Jose** (Security, JWT auth)
- **FFmpeg & FFprobe** (Audio/video extraction)
- **OpenCV** (Frame sampling & thumbnails)
- **SciPy & NumPy** (RMS audio signal processing)
- **Scikit-learn** (Normalized TF-IDF vectorizer & cosine similarity)
- **PyPDF & Python-docx** (Resume parsing)
- **Pytest** (Automated test suite)

### Frontend
- **Next.js 14+** (App Router, Server & Client Components)
- **TypeScript** (Strict type safety)
- **Tailwind CSS** (Modern utility styling)
- **Recharts** (Interactive radar charts & analytics)
- **Lucide React** (UI iconography)

### DevOps & Containerization
- **Docker & Docker Compose** (Full stack containerization)
- **GitHub Actions** (Continuous Integration workflow: Pytest, Typecheck, Next.js build, Docker validate)

---

## 4. Repository Structure

```
interviewlens-ai/
├── .github/
│   └── workflows/
│       └── ci.yml                     # GitHub Actions CI/CD Pipeline
├── backend/
│   ├── alembic/                       # Database migrations
│   │   ├── env.py
│   │   └── versions/                  # Migration scripts (Initial, Jobs, Timeline, Milestones)
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py                # Dependency injection (Auth, DB)
│   │   │   └── v1/                    # API v1 routes
│   │   │       ├── auth.py            # Registration, login, profile
│   │   │       ├── users.py           # User profile & interview statistics
│   │   │       ├── videos.py          # Video upload, processing, HTTP 206 streaming
│   │   │       ├── transcripts.py     # Whisper transcription & user corrections
│   │   │       ├── evaluations.py     # Rubric grading & session report
│   │   │       ├── audio_analytics.py # DSP speaking metrics
│   │   │       ├── interviews.py      # Stateful adaptive turn sessions
│   │   │       ├── resumes.py         # Resume parsing, ATS match, defense questions
│   │   │       └── rag.py             # Hybrid RAG & benchmark calibration
│   │   ├── core/                      # Config, security, rate limiting middleware
│   │   ├── database.py                # SQLAlchemy engine & session factory
│   │   ├── models/                    # Database models (User, Video, Interview, Evaluation, Resume)
│   │   ├── schemas/                   # Pydantic v2 validation contracts
│   │   ├── services/                  # Business logic engines
│   │   │   ├── video_service.py       # FFmpeg/FFprobe media inspection
│   │   │   ├── background_worker.py   # Async media processing worker
│   │   │   ├── audio_analytics.py     # DSP RMS silence, WPM, filler word detection
│   │   │   ├── transcription_service.py # Speech-to-text adapter
│   │   │   ├── evaluation_service.py  # 10 category rubric scoring & evidence extraction
│   │   │   ├── adaptive_engine.py     # Dynamic follow-up generation & budgeting
│   │   │   ├── resume_service.py      # Resume extraction, ATS matcher, practice plans
│   │   │   ├── rag_service.py         # Hybrid RAG retriever & authoritative corpus
│   │   │   └── benchmark_service.py   # 3-tier automated calibration suite
│   │   └── main.py                    # FastAPI application initialization
│   ├── tests/                         # Pytest test suite (44 automated tests)
│   │   ├── conftest.py                # Database and auth test fixtures
│   │   ├── test_auth.py               # Authentication tests
│   │   ├── test_users.py              # User profile tests
│   │   ├── test_videos.py             # Video processing & streaming tests
│   │   ├── test_evaluation_and_transcripts.py # Transcription & rubric tests
│   │   ├── test_adaptive_interview.py # Adaptive session progression tests
│   │   ├── test_evidence_report.py    # Interactive timeline & report tests
│   │   ├── test_resume_intelligence.py# Resume parsing, ATS match, defense tests
│   │   ├── test_rag_and_benchmark.py  # Hybrid RAG & benchmark calibration tests
│   │   └── test_security_audit.py     # Security headers, rate limiting, path traversal
│   ├── requirements.txt               # Pinned Python dependencies
│   └── Dockerfile                     # Production backend Docker image
├── frontend/
│   ├── src/
│   │   ├── app/                       # Next.js App Router pages (13 routes)
│   │   │   ├── page.tsx               # Landing page with multimodal architecture preview
│   │   │   ├── login/ & register/     # Candidate authentication pages
│   │   │   ├── dashboard/             # Candidate overview dashboard
│   │   │   │   ├── interviews/        # Mock interview catalog & history
│   │   │   │   │   ├── new/           # Setup wizard (10 domains, difficulty, budget)
│   │   │   │   │   ├── session/[id]/  # Live stateful turn interview interface
│   │   │   │   │   ├── upload/        # Drag-and-drop video upload workspace
│   │   │   │   │   ├── processing/[id]/# Real-time 5-stage background progress
│   │   │   │   │   ├── evaluate/[id]/ # Interactive video + transcript sync
│   │   │   │   │   └── report/[id]/   # Video timeline scrubber & radar report
│   │   │   │   ├── resume/            # Resume intelligence, ATS matcher, defense Qs
│   │   │   │   ├── practice/          # Personalized practice plans & roadmaps
│   │   │   │   └── analytics/         # Scoring calibration & RAG search sandbox
│   │   ├── components/                # Reusable UI components (Sidebar, Navbar)
│   │   ├── lib/api.ts                 # Typed API client
│   │   └── types/index.ts             # TypeScript interfaces
│   ├── package.json                   # Frontend dependencies
│   ├── next.config.js                 # Standalone output configuration
│   └── Dockerfile                     # Multi-stage production frontend Docker image
├── docker-compose.yml                 # PostgreSQL + pgvector, Backend, Frontend
├── ARCHITECTURE.md                    # Detailed architecture & interview defense guide
└── README.md
```

---

## 5. Quickstart Guide

### Prerequisites
- Python 3.12+
- Node.js 20+
- FFmpeg installed and accessible on your system PATH
- Docker & Docker Compose (optional for containerized deployment)

### 5.1 Local Development Setup

#### 1. Clone & Set Up Backend
```bash
cd backend
python -m venv venv

# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

pip install -r requirements.txt

# Apply database migrations (defaults to local SQLite)
python -m alembic upgrade head

# Start FastAPI development server
uvicorn app.main:app --reload --port 8000
```
API Documentation will be live at: `http://localhost:8000/api/v1/docs`

#### 2. Set Up Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend will be live at: `http://localhost:3000`

---

### 5.2 Running via Docker Compose (PostgreSQL + pgvector)

```bash
docker compose up --build
```
This spins up:
- **db**: PostgreSQL 16 with `pgvector` extension enabled on port `5432`
- **backend**: FastAPI service on port `8000`
- **frontend**: Next.js production standalone server on port `3000`

---

## 6. Running Automated Tests

InterviewLens AI includes **44 comprehensive automated tests** across all backend modules.

```bash
cd backend
python -m pytest tests/ -v
```

Expected output:
```
======================== 44 passed, 1 warning in 7.84s ========================
```

To build and verify the Next.js frontend with zero errors:
```bash
cd frontend
npm run build
```

Expected output:
```
✓ Compiled successfully
✓ Generating static pages (13/13)
```

---

## 7. Security Hardening

- **Security Headers**: All responses include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy`.
- **IP Rate Limiting**: In-memory sliding-window limiter throttles auth endpoints (30 req/min) and file uploads (40 uploads/min), returning HTTP 429 with `Retry-After`.
- **Directory Traversal Defense**: All file access endpoints use canonicalized path checks (`assert_safe_path`) preventing directory escape attacks (`../../etc/passwd`).
- **Media Validation**: Strict container whitelist, SHA-256 integrity checksums, and early aborts on uploads exceeding 150MB.

---

## 8. License & Portfolio Attribution

Designed and developed by **Khush** as an advanced multimodal AI mock interview engineering portfolio project. Built for production demonstration, architectural interview defense, and end-to-end full-stack AI evaluation.
