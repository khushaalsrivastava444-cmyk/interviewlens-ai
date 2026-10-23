import io
import re
import os
import uuid
from typing import List, Dict, Any, Optional, Tuple

import pypdf
import docx

from app.schemas.resume import (
    ParsedProject,
    ParsedExperience,
    ParsedEducation,
    ProjectDefenseQuestion,
    JobDescriptionMatchResponse,
    LearningMilestone,
)

# Comprehensive Technical Skills Taxonomy by Domain
TECHNICAL_SKILLS_TAXONOMY: Dict[str, List[str]] = {
    "languages": [
        "python", "sql", "c++", "java", "typescript", "javascript",
        "go", "rust", "bash", "r", "c#", "scala"
    ],
    "ml_dl": [
        "pytorch", "tensorflow", "scikit-learn", "keras", "xgboost",
        "lightgbm", "pandas", "numpy", "opencv", "scipy", "hugging face",
        "matplotlib", "seaborn", "cuda", "onnx", "tensorrt"
    ],
    "nlp_llm_rag": [
        "transformers", "bert", "gpt", "rag", "langchain", "llamaindex",
        "sentence transformers", "embeddings", "prompt engineering", "lora",
        "peft", "vector db", "faiss", "pinecone", "chromadb", "qdrant",
        "retrieval augmented generation", "fine-tuning", "bm25", "reranking"
    ],
    "data_dbms": [
        "postgresql", "mysql", "redis", "mongodb", "cassandra", "spark",
        "kafka", "snowflake", "airflow", "alembic", "sqlalchemy", "sqlite",
        "dbt", "elasticsearch", "bigquery"
    ],
    "backend_cloud": [
        "fastapi", "flask", "django", "node.js", "express", "docker",
        "kubernetes", "aws", "gcp", "azure", "rest", "graphql", "grpc",
        "microservices", "ci/cd", "git", "linux", "nginx", "github actions",
        "celery", "rabbitmq"
    ],
    "core_sys_design": [
        "distributed systems", "scalability", "caching", "load balancing",
        "system design", "data structures", "algorithms", "multithreading",
        "asyncio", "acid", "sharding", "replication", "cap theorem"
    ],
}


class ResumeIntelligenceService:
    def __init__(self):
        # Flatten taxonomy with domain reverse-lookup
        self.skill_to_domain: Dict[str, str] = {}
        for domain, skills in TECHNICAL_SKILLS_TAXONOMY.items():
            for s in skills:
                self.skill_to_domain[s.lower()] = domain

    def extract_text_from_file(self, file_bytes: bytes, filename: str) -> str:
        """
        Extract clean text from PDF, DOCX, or plain text bytes.
        """
        ext = os.path.splitext(filename)[1].lower()

        if ext == ".pdf":
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                text_parts = []
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text() or ""
                    if page_text.strip():
                        text_parts.append(page_text.strip())
                extracted = "\n\n".join(text_parts)
                if not extracted.strip():
                    raise ValueError("PDF contains no selectable or extractable text.")
                return extracted
            except Exception as e:
                raise ValueError(f"Failed to parse PDF resume: {str(e)}")

        elif ext in [".docx", ".doc"]:
            try:
                doc = docx.Document(io.BytesIO(file_bytes))
                paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                for table in doc.tables:
                    for row in table.rows:
                        row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                        if row_text:
                            paragraphs.append(row_text)
                extracted = "\n".join(paragraphs)
                if not extracted.strip():
                    raise ValueError("Document contains no text.")
                return extracted
            except Exception as e:
                raise ValueError(f"Failed to parse DOCX resume: {str(e)}")

        elif ext in [".txt", ".md"]:
            try:
                return file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                return file_bytes.decode("latin-1")
        else:
            raise ValueError(f"Unsupported file format '{ext}'. Please upload PDF, DOCX, or TXT.")

    def extract_skills(self, text: str) -> Tuple[List[str], Dict[str, List[str]]]:
        """
        Extract technical skills from resume text using boundary-aware regex matching.
        Returns both a deduplicated list and a domain-categorized dictionary.
        """
        text_lower = text.lower()
        matched_skills: List[str] = []
        skills_by_category: Dict[str, List[str]] = {d: [] for d in TECHNICAL_SKILLS_TAXONOMY.keys()}

        for skill, domain in self.skill_to_domain.items():
            # Boundary-aware matching: handle special characters like c++, .js, c#
            escaped_skill = re.escape(skill)
            pattern = rf"(?:\b|^){escaped_skill}(?:\b|$)"
            if re.search(pattern, text_lower):
                matched_skills.append(skill)
                skills_by_category[domain].append(skill)

        # Sort and deduplicate
        matched_skills = sorted(list(set(matched_skills)))
        # Filter empty category lists
        filtered_by_category = {k: v for k, v in skills_by_category.items() if v}

        return matched_skills, filtered_by_category

    def extract_projects(self, text: str) -> List[ParsedProject]:
        """
        Heuristic extraction of candidate projects, tech stacks, and quantifiable metrics.
        """
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        projects: List[ParsedProject] = []

        # Find project section
        project_section_lines: List[str] = []
        in_project_section = False
        section_headers = ["projects", "personal projects", "academic projects", "key projects", "technical projects"]

        for line in lines:
            cleaned = line.lower().strip(":#- ")
            if any(cleaned == h or cleaned.startswith(f"{h} ") for h in section_headers):
                in_project_section = True
                continue
            elif in_project_section and any(
                cleaned == h for h in ["experience", "work experience", "education", "skills", "certifications", "publications"]
            ):
                in_project_section = False
                break

            if in_project_section:
                project_section_lines.append(line)

        # Fallback if no explicit "projects" section was labeled
        if not project_section_lines:
            project_section_lines = [
                line for line in lines
                if any(w in line.lower() for w in ["developed", "built", "implemented", "designed", "trained", "deployed", "fine-tuned"])
            ]

        # Group lines into project blocks
        current_name = ""
        current_lines: List[str] = []

        for line in project_section_lines:
            # Detect project title line (e.g., "InterviewLens AI | Python, FastAPI, Next.js" or short bold header)
            is_title = (
                ("|" in line or " - " in line or line.isupper() or len(line.split()) <= 6)
                and not line.startswith(("-", "•", "*", "–"))
                and len(line) < 120
            )

            if is_title and current_lines:
                # Flush previous project
                projects.append(self._build_project_obj(current_name, current_lines))
                current_name = line
                current_lines = []
            elif is_title and not current_name:
                current_name = line
            else:
                current_lines.append(line)

        if current_name or current_lines:
            projects.append(self._build_project_obj(current_name or "Technical Project", current_lines))

        # If still empty, synthesize an overarching project from extracted achievements
        if not projects:
            projects.append(
                ParsedProject(
                    name="Engineering Portfolio",
                    description="Software engineering and machine learning implementation work.",
                    technologies=self.extract_skills(text)[0][:6],
                    metrics=[],
                    highlights=["Contributed to technical codebases and engineering pipelines."],
                )
            )

        return projects[:6]  # Bound to top 6 projects

    def _build_project_obj(self, title_line: str, body_lines: List[str]) -> ParsedProject:
        # Extract title name
        name = title_line.split("|")[0].split(" - ")[0].strip(":#-* ") or "Engineering Project"
        full_text = f"{title_line} " + " ".join(body_lines)

        # Extract technologies used in project
        techs, _ = self.extract_skills(full_text)

        # Extract quantifiable metrics
        metric_pattern = r"(?:\d+(?:\.\d+)?%|\b\d+x\b|\b\d+\s*(?:ms|seconds|minutes|users|requests|qps|fps|tokens)\b|\b\d+(?:,\d{3})+\b)"
        metrics = re.findall(metric_pattern, full_text, flags=re.IGNORECASE)

        # Clean highlights
        highlights = [b.lstrip("-•*– ").strip() for b in body_lines if len(b.strip()) > 15]

        description = highlights[0] if highlights else (body_lines[0] if body_lines else "Implementation project.")

        return ParsedProject(
            name=name,
            description=description,
            technologies=techs,
            metrics=list(set(metrics))[:4],
            highlights=highlights[:5],
        )

    def extract_experience_and_education(
        self, text: str
    ) -> Tuple[List[ParsedExperience], List[ParsedEducation]]:
        """Extract high-level work experience and education items."""
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        experiences: List[ParsedExperience] = []
        educations: List[ParsedEducation] = []

        in_exp = False
        in_edu = False

        for line in lines:
            cleaned = line.lower().strip(":#- ")
            if cleaned in ["experience", "work experience", "professional experience", "employment"]:
                in_exp = True
                in_edu = False
                continue
            elif cleaned in ["education", "academic background", "degrees"]:
                in_edu = True
                in_exp = False
                continue
            elif any(cleaned == h for h in ["skills", "projects", "certifications"]):
                in_exp = False
                in_edu = False
                continue

            if in_exp and len(line) > 10:
                if any(w in line.lower() for w in ["engineer", "developer", "intern", "assistant", "scientist", "analyst"]):
                    experiences.append(
                        ParsedExperience(
                            title=line,
                            company=None,
                            duration=None,
                            responsibilities=[],
                        )
                    )
            elif in_edu and len(line) > 8:
                if any(w in line.lower() for w in ["bachelor", "master", "phd", "b.tech", "b.s.", "m.s.", "university", "institute", "college"]):
                    educations.append(
                        ParsedEducation(
                            degree=line,
                            institution=None,
                            year=None,
                        )
                    )

        return experiences[:5], educations[:3]

    def generate_project_defense_questions(
        self, projects: List[ParsedProject]
    ) -> List[ProjectDefenseQuestion]:
        """
        Generate deep, architectural project defense interview questions tailored
        directly to the candidate's extracted projects, technologies, and claimed metrics.
        """
        defense_questions: List[ProjectDefenseQuestion] = []

        for p in projects:
            p_name = p.name
            techs = p.technologies
            tech_str = ", ".join(techs[:3]) if techs else "your chosen technology stack"

            # 1. Architecture & Baseline Question
            defense_questions.append(
                ProjectDefenseQuestion(
                    id=str(uuid.uuid4()),
                    project_name=p_name,
                    question_text=(
                        f"In your project '{p_name}', why did you decide on {tech_str}? "
                        "What simple baseline did you compare your initial solution against, and what was the main engineering trade-off?"
                    ),
                    technical_focus="Architecture & Baseline Comparison",
                    sample_expected_topics=["Baseline comparisons", "Trade-off analysis", "Selection criteria"],
                )
            )

            # 2. Performance / Bottleneck Question (especially if metrics mentioned)
            metric_claim = f" You noted {p.metrics[0]} in your response." if p.metrics else ""
            defense_questions.append(
                ProjectDefenseQuestion(
                    id=str(uuid.uuid4()),
                    project_name=p_name,
                    question_text=(
                        f"During the implementation of '{p_name}', what was the single biggest bottleneck you encountered"
                        f"{metric_claim} How did you profile latency or resource utilization to resolve it?"
                    ),
                    technical_focus="Engineering Bottlenecks & Optimization",
                    sample_expected_topics=["Profiling tools", "Computational complexity", "Caching / index optimization"],
                )
            )

            # 3. Edge Cases & Reliability Question
            defense_questions.append(
                ProjectDefenseQuestion(
                    id=str(uuid.uuid4()),
                    project_name=p_name,
                    question_text=(
                        f"If '{p_name}' had to handle a 10x sudden surge in traffic or edge-case corrupted data inputs in production, "
                        "where would the architecture first break down and how would you safeguard against it?"
                    ),
                    technical_focus="Production Rigor & Fault Tolerance",
                    sample_expected_topics=["Horizontal scaling", "Input validation", "Circuit breaking", "Failover"],
                )
            )

        return defense_questions[:8]

    def match_job_description(
        self, resume_skills: List[str], jd_text: str, target_role: Optional[str] = None
    ) -> JobDescriptionMatchResponse:
        """
        Compare candidate skills against a Job Description.
        Calculates matching score, identifies missing critical skills, and provides ATS recommendations.
        """
        jd_skills, jd_by_cat = self.extract_skills(jd_text)

        if not jd_skills:
            # Fallback if JD text had non-standard terminology
            return JobDescriptionMatchResponse(
                match_score=75.0,
                matched_skills=resume_skills[:5],
                missing_critical_skills=["System Design", "Cloud Infrastructure"],
                preferred_skills_found=resume_skills[5:8],
                ats_recommendations=[
                    "Include explicit mention of production cloud environments (AWS/GCP).",
                    "Add quantifiable business impact metrics to project bullet points.",
                ],
                recommended_interview_categories=["backend_sys_design", "ml_dl"],
            )

        resume_skill_set = set(s.lower() for s in resume_skills)
        jd_skill_set = set(s.lower() for s in jd_skills)

        matched = sorted(list(resume_skill_set.intersection(jd_skill_set)))
        missing = sorted(list(jd_skill_set - resume_skill_set))

        # Calculate weighted match score
        coverage_ratio = len(matched) / max(len(jd_skills), 1)
        match_score = round(min(100.0, max(15.0, coverage_ratio * 90.0 + 10.0)), 1)

        # ATS recommendations
        ats_recommendations = []
        if missing:
            top_missing = ", ".join(missing[:3])
            ats_recommendations.append(
                f"Incorporate missing core technical keywords explicitly in your skills list: {top_missing}."
            )
        if len(matched) < 5:
            ats_recommendations.append(
                "Align phrasing closer to JD keywords (e.g. use standard naming like 'PostgreSQL' instead of general 'DB')."
            )
        ats_recommendations.append(
            "Ensure each project bullet point pairs an action verb with a measurable metric (e.g., 'reduced query latency by 45%')."
        )
        ats_recommendations.append(
            "Keep technical skills section cleanly partitioned by category for automated ATS parsers."
        )

        # Recommended interview categories based on missing and required skills
        recommended_cats = []
        for miss in missing:
            dom = self.skill_to_domain.get(miss)
            if dom and dom not in recommended_cats:
                recommended_cats.append(dom)

        if not recommended_cats:
            recommended_cats = ["ml_dl", "backend_sys_design", "resume_defense"]

        return JobDescriptionMatchResponse(
            match_score=match_score,
            matched_skills=matched,
            missing_critical_skills=missing,
            preferred_skills_found=matched[:4],
            ats_recommendations=ats_recommendations,
            recommended_interview_categories=recommended_cats[:4],
        )

    def generate_learning_plan(
        self,
        target_role: str,
        missing_skills: List[str],
        identified_gaps: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Synthesize a structured 3-phase practice plan based on identified skill gaps.
        """
        gaps = identified_gaps or []
        combined_gaps = list(set(missing_skills + gaps))

        if not combined_gaps:
            combined_gaps = ["Distributed Caching", "Data Leakage Prevention", "System Architecture"]

        recommended_topics = [
            f"Mastering {gap.replace('_', ' ').title()}" for gap in combined_gaps[:5]
        ]

        milestones = [
            LearningMilestone(
                phase="Phase 1: Foundations & Core Mechanics",
                title=f"Theoretical & Implementation Foundations for {target_role}",
                focus_areas=combined_gaps[:2] if len(combined_gaps) >= 2 else combined_gaps,
                recommended_practice="Practice foundational coding and conceptual explanation questions.",
            ),
            LearningMilestone(
                phase="Phase 2: Production Constraints & Edge Cases",
                title="System Design, Reliability & Scaling Trade-offs",
                focus_areas=combined_gaps[2:4] if len(combined_gaps) >= 4 else ["Edge Cases & Latency"],
                recommended_practice="Complete stateful mock interview sessions focusing on architectural defense.",
            ),
            LearningMilestone(
                phase="Phase 3: Multimodal Mock Defense & Synthesis",
                title="Full End-to-End Mock Interviews & Timing Rigor",
                focus_areas=["Acoustic Cadence (WPM)", "Resume Project Defense", "STAR Behavioral Alignment"],
                recommended_practice="Record full video answers and review interactive timeline scrubber evidence.",
            ),
        ]

        practice_questions = [
            {
                "topic": combined_gaps[0] if combined_gaps else "System Design",
                "question": f"How do you architect a scalable pipeline using {combined_gaps[0] if combined_gaps else 'FastAPI'} while ensuring zero data loss?",
                "difficulty": "mid",
            },
            {
                "topic": combined_gaps[1] if len(combined_gaps) > 1 else "Trade-offs",
                "question": f"What are the primary operational bottlenecks when deploying {combined_gaps[1] if len(combined_gaps) > 1 else 'ML models'} to production?",
                "difficulty": "senior",
            },
            {
                "topic": "Project Defense",
                "question": "Walk through the architectural trade-offs of your flagship portfolio project. What would you design differently today?",
                "difficulty": "mid",
            },
        ]

        return {
            "target_role": target_role,
            "identified_gaps": combined_gaps,
            "recommended_topics": recommended_topics,
            "milestones": [m.model_dump() for m in milestones],
            "practice_questions": practice_questions,
        }


resume_intelligence_service = ResumeIntelligenceService()
