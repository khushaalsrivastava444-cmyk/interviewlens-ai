import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.services.audio_analytics import audio_analytics_engine

# Category-specific technical competencies and key expectations
CATEGORY_RUBRIC_SPECIFICATIONS: Dict[str, Dict[str, Any]] = {
    "ml_dl": {
        "criteria": [
            "technical_correctness",
            "conceptual_understanding",
            "leakage_and_validation_rigor",
            "metric_selection_tradeoffs",
        ],
        "keywords": {
            "cross_validation": ["cross validation", "k-fold", "stratified", "validation fold"],
            "data_leakage": ["leakage", "data leakage", "scaler fit", "fit transform"],
            "metrics": ["precision", "recall", "f1", "f1-score", "roc", "pr-auc", "confusion matrix", "accuracy"],
            "overfitting": ["overfitting", "regularization", "generalization", "variance"],
        },
        "default_follow_up": "How would you ensure preprocessing parameters like mean and standard deviation do not leak from the test set during feature scaling?",
    },
    "nlp_llm_rag": {
        "criteria": [
            "technical_correctness",
            "retrieval_and_chunking_strategy",
            "grounding_and_hallucination_control",
            "practical_application",
        ],
        "keywords": {
            "embeddings": ["embedding", "vector", "cosine", "dense retrieval", "similarity"],
            "chunking": ["chunk", "chunking", "token limit", "overlap", "sliding window"],
            "hallucination": ["grounding", "hallucination", "faithfulness", "source attribution"],
            "reranking": ["rerank", "cross-encoder", "bm25", "hybrid search"],
        },
        "default_follow_up": "What chunk size and overlap strategy would you choose for structured technical documents, and how would you evaluate retrieval faithfulness?",
    },
    "python": {
        "criteria": [
            "technical_correctness",
            "language_internals_and_memory",
            "clean_code_and_idioms",
            "complexity_and_edge_cases",
        ],
        "keywords": {
            "memory": ["reference counting", "garbage collection", "memory", "mutable", "immutable"],
            "concurrency": ["gil", "global interpreter lock", "multiprocessing", "asyncio", "thread"],
            "generators": ["generator", "yield", "iterator", "lazy evaluation", "comprehension"],
        },
        "default_follow_up": "How does Python's Global Interpreter Lock (GIL) impact CPU-bound versus I/O-bound multithreaded programs?",
    },
    "dsa": {
        "criteria": [
            "technical_correctness",
            "time_complexity_analysis",
            "space_complexity_analysis",
            "edge_cases",
        ],
        "keywords": {
            "complexity": ["o(1)", "o(n)", "o(log n)", "o(n log n)", "time complexity", "space complexity"],
            "structures": ["hash map", "tree", "graph", "heap", "stack", "queue", "binary search"],
            "edge_cases": ["empty", "null", "overflow", "duplicates", "boundary", "single element"],
        },
        "default_follow_up": "Can you analyze the worst-case space complexity and explain what edge cases (such as duplicate keys or empty inputs) must be handled?",
    },
    "sql_dbms": {
        "criteria": [
            "technical_correctness",
            "query_optimization_and_indexing",
            "acid_and_concurrency",
            "schema_design",
        ],
        "keywords": {
            "query_optimization": ["selectivity", "sequential scan", "cost", "planner", "explain analyze", "scan"],
            "indexing_structure": ["b-tree", "composite index", "index", "indexes", "hash index", "bitmap"],
            "acid_transactions": ["acid", "transaction", "isolation level", "atomicity", "consistency", "wal"],
            "schema_and_joins": ["inner join", "left join", "foreign key", "normalization", "cardinality"],
        },
        "default_follow_up": "When would a B-tree index not be utilized by the PostgreSQL query planner even if the column is indexed?",
    },
    "data_science_stats": {
        "criteria": [
            "technical_correctness",
            "statistical_intuition",
            "hypothesis_testing",
            "distributional_assumptions",
        ],
        "keywords": {
            "testing": ["p-value", "null hypothesis", "significance level", "type 1 error", "power"],
            "distributions": ["normal distribution", "skewed", "variance", "central limit theorem"],
            "correlation": ["correlation", "causation", "covariance", "multicollinearity"],
        },
        "default_follow_up": "What is the practical difference between Type I and Type II errors in this scenario, and how would you adjust the decision threshold?",
    },
    "mlops": {
        "criteria": [
            "technical_correctness",
            "model_monitoring_and_drift",
            "deployment_and_serving_latency",
            "pipeline_reproducibility",
        ],
        "keywords": {
            "drift": ["concept drift", "data drift", "covariate shift", "evidently", "monitoring"],
            "serving": ["latency", "batch", "real-time", "docker", "onnx", "quantization"],
            "tracking": ["mlflow", "versioning", "feature store", "ci/cd", "artifact"],
        },
        "default_follow_up": "How would you detect data drift in production when true labels arrive with a multi-day latency delay?",
    },
    "backend_sys_design": {
        "criteria": [
            "technical_correctness",
            "scalability_and_tradeoffs",
            "data_storage_and_caching",
            "fault_tolerance",
        ],
        "keywords": {
            "scaling": ["horizontal scaling", "load balancer", "stateless", "throughput"],
            "caching": ["redis", "cache invalidation", "cache aside", "ttl", "memcached"],
            "reliability": ["failover", "replication", "cap theorem", "idempotency", "circuit breaker"],
        },
        "default_follow_up": "How would you handle cache stampedes and ensure idempotency for distributed payment requests?",
    },
    "resume_defense": {
        "criteria": [
            "technical_depth_on_projects",
            "architecture_reasoning",
            "measurable_impact",
            "limitations_and_future_work",
        ],
        "keywords": {
            "architecture": ["architecture", "pipeline", "selected", "baseline", "model"],
            "impact": ["latency reduced", "accuracy improved", "throughput", "percent", "metric"],
            "tradeoffs": ["bottleneck", "limitation", "tradeoff", "compromise"],
        },
        "default_follow_up": "What baseline did you compare your model against, and what was the primary engineering bottleneck you encountered during implementation?",
    },
    "behavioral": {
        "criteria": [
            "star_framework_structure",
            "ownership_and_initiative",
            "communication_clarity",
            "lessons_learned",
        ],
        "keywords": {
            "star": ["situation", "task", "action", "result", "outcome", "team"],
            "reflection": ["learned", "retrospect", "improved", "feedback", "growth"],
        },
        "default_follow_up": "Looking back at that outcome, what specific technical or communication decision would you approach differently today?",
    },
}


class TimelineMarker(BaseModel):
    timestamp: float
    concept: str
    quote: str
    marker_type: str = "strength"  # strength, gap, hesitation


class CriterionEvaluation(BaseModel):
    name: str
    score: float
    maximum_score: float = 5.0
    evidence: List[str]
    feedback: str


class EvaluationResult(BaseModel):
    overall_score: float
    maximum_score: float = 5.0
    strengths: List[str]
    missing_concepts: List[str]
    criteria_scores: List[CriterionEvaluation]
    recommended_follow_up: Optional[str] = None
    speaking_metrics: Optional[Dict[str, Any]] = None
    timeline_markers: List[TimelineMarker] = []
    model_name: str = "rubric_evaluator_v1"
    rubric_version: str = "1.0"


class AnswerEvaluationEngine:
    def __init__(self):
        pass

    def _find_timestamp_for_phrase(
        self, phrase: str, transcript_segments: Optional[List[Dict[str, Any]]]
    ) -> float:
        """Find the start timestamp of the segment containing the matched phrase."""
        if not transcript_segments:
            return 0.0

        p_lower = phrase.lower()
        for seg in transcript_segments:
            text = seg.get("text", "").lower()
            if p_lower in text:
                return float(seg.get("start_time", 0.0))
        return 0.0

    def evaluate_answer(
        self,
        question_text: str,
        category: str,
        candidate_answer: str,
        expected_competencies: Optional[List[str]] = None,
        difficulty: str = "entry",
        audio_path: Optional[str] = None,
        video_duration: Optional[float] = None,
        transcript_segments: Optional[List[Dict[str, Any]]] = None,
    ) -> EvaluationResult:
        """
        Evaluate candidate interview answer against rubric criteria.
        Extracts verified evidence quotes and attaches exact timestamps for video timeline synchronization.
        """
        cat_key = category.lower().replace("-", "_").replace(" ", "_")
        spec = CATEGORY_RUBRIC_SPECIFICATIONS.get(cat_key, CATEGORY_RUBRIC_SPECIFICATIONS["ml_dl"])

        answer_lower = candidate_answer.lower()
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", candidate_answer) if s.strip()]

        strengths: List[str] = []
        missing_concepts: List[str] = []
        timeline_markers: List[TimelineMarker] = []
        criteria_evaluations: List[CriterionEvaluation] = []

        # Analyze keywords & evidence
        keyword_dict = spec.get("keywords", {})
        covered_topics = 0
        total_topics = max(len(keyword_dict), 1)

        for topic_name, phrases in keyword_dict.items():
            matched_phrase = next(
                (p for p in phrases if re.search(rf"\b{re.escape(p)}\b", answer_lower)), None
            )
            if matched_phrase:
                covered_topics += 1
                evidence_sentence = next(
                    (s for s in sentences if matched_phrase in s.lower()),
                    f"Mentioned {matched_phrase} in answer."
                )
                ts = self._find_timestamp_for_phrase(matched_phrase, transcript_segments)

                timestamp_label = f"[{int(ts // 60)}:{int(ts % 60):02d}]"
                strengths.append(
                    f"{timestamp_label} Demonstrated {topic_name.replace('_', ' ')}: \"{evidence_sentence}\""
                )
                timeline_markers.append(
                    TimelineMarker(
                        timestamp=ts,
                        concept=topic_name.replace("_", " "),
                        quote=evidence_sentence,
                        marker_type="strength",
                    )
                )
            else:
                missing_concepts.append(
                    f"Did not cover {topic_name.replace('_', ' ')} (e.g., expected discussion of {', '.join(phrases[:2])})"
                )

        # Detect hesitation / filler word moments on the timeline
        if transcript_segments:
            for seg in transcript_segments:
                seg_text = seg.get("text", "").lower()
                for filler in ["um", "uh", "er", "like", "you know", "basically", "so yeah"]:
                    pattern = r"(?:\b|^)" + re.escape(filler) + r"(?:\b|$)"
                    if re.search(pattern, seg_text):
                        ts = float(seg.get("start_time", 0.0))
                        # Avoid multiple hesitation markers within 1.5s
                        if not any(abs(m.timestamp - ts) < 1.5 and m.marker_type == "hesitation" for m in timeline_markers):
                            timeline_markers.append(
                                TimelineMarker(
                                    timestamp=ts,
                                    concept="Hesitation / Filler",
                                    quote=f"Filler phrase '{filler}' detected",
                                    marker_type="hesitation",
                                )
                            )
                        break

        timeline_markers.sort(key=lambda m: m.timestamp)

        # Compute criteria scores
        criteria_names = spec.get("criteria", ["technical_correctness", "conceptual_understanding", "completeness"])
        coverage_ratio = covered_topics / total_topics

        # Length / depth multiplier
        word_count = len(re.findall(r"\b\w+\b", candidate_answer))
        depth_score = min(5.0, max(1.0, (word_count / 40.0) * 4.0))

        for criterion in criteria_names:
            if criterion == "technical_correctness":
                crit_score = round(min(5.0, max(1.5, 2.0 + coverage_ratio * 3.0)), 1)
                crit_feedback = (
                    "Good technical explanation."
                    if coverage_ratio > 0.6
                    else "Answer lacks specific technical mechanics and definitions."
                )
            elif criterion in ["completeness", "star_framework_structure"]:
                crit_score = round(min(5.0, max(1.0, 1.5 + coverage_ratio * 3.5)), 1)
                crit_feedback = (
                    "Comprehensive coverage of core concepts."
                    if coverage_ratio >= 0.75
                    else f"Several expected competencies were omitted ({len(missing_concepts)} gaps identified)."
                )
            elif criterion in ["conceptual_understanding", "language_internals_and_memory"]:
                crit_score = round(min(5.0, max(1.5, (depth_score + coverage_ratio * 5.0) / 2.0)), 1)
                crit_feedback = "Demonstrates foundational reasoning behind the chosen approach."
            else:
                crit_score = round(min(5.0, max(2.0, 2.5 + coverage_ratio * 2.5)), 1)
                crit_feedback = "Consider providing more concrete production edge cases or trade-offs."

            criterion_evidence = strengths[:2] if strengths else ["No direct evidence captured in brief response."]
            criteria_evaluations.append(
                CriterionEvaluation(
                    name=criterion,
                    score=crit_score,
                    maximum_score=5.0,
                    evidence=criterion_evidence,
                    feedback=crit_feedback
                )
            )

        overall_score = round(sum(c.score for c in criteria_evaluations) / len(criteria_evaluations), 1)

        if missing_concepts:
            first_gap = missing_concepts[0].replace("Did not cover ", "")
            recommended_follow_up = f"You mentioned your approach, but how would you specifically address {first_gap}?"
        else:
            recommended_follow_up = spec.get("default_follow_up", "What architectural trade-offs would emerge at 10x scale?")

        speaking_metrics = audio_analytics_engine.compute_metrics(
            candidate_answer, audio_path=audio_path, override_duration=video_duration
        )

        return EvaluationResult(
            overall_score=overall_score,
            maximum_score=5.0,
            strengths=strengths if strengths else ["Answer provided in audible speech."],
            missing_concepts=missing_concepts,
            criteria_scores=criteria_evaluations,
            recommended_follow_up=recommended_follow_up,
            speaking_metrics=speaking_metrics,
            timeline_markers=timeline_markers,
            model_name="rubric_evaluator_v1",
            rubric_version="1.0"
        )


answer_evaluation_engine = AnswerEvaluationEngine()
