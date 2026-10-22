import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.interview import InterviewSession, Question
from app.models.evaluation import Evaluation

# Curated initial foundational question banks across all 10 technical categories
INITIAL_QUESTION_BANK: Dict[str, List[Dict[str, Any]]] = {
    "ml_dl": [
        {
            "text": "How would you evaluate a machine learning model on an imbalanced dataset, and what steps do you take to avoid data leakage during cross-validation?",
            "expected_competencies": ["precision_recall_tradeoff", "data_leakage", "stratified_kfold", "pr_auc"],
            "difficulty": "entry",
        },
        {
            "text": "Explain the bias-variance tradeoff in machine learning. How do regularization techniques like L1 and L2 affect model weights?",
            "expected_competencies": ["bias_variance", "l1_l2_regularization", "overfitting"],
            "difficulty": "mid",
        },
    ],
    "nlp_llm_rag": [
        {
            "text": "In a Retrieval-Augmented Generation (RAG) system, how do you decide on chunk size and chunk overlap, and how do you evaluate whether retrieved chunks are relevant versus hallucinated?",
            "expected_competencies": ["chunking_strategy", "dense_retrieval", "hallucination_evaluation", "context_window"],
            "difficulty": "entry",
        },
        {
            "text": "Explain the self-attention mechanism in the Transformer architecture. What is the computational complexity with respect to sequence length, and how do modern architectures optimize it?",
            "expected_competencies": ["self_attention", "computational_complexity", "key_query_value"],
            "difficulty": "mid",
        },
    ],
    "python": [
        {
            "text": "How does memory management work in Python, specifically regarding reference counting and circular garbage collection? When would you use a generator over a list comprehension?",
            "expected_competencies": ["reference_counting", "garbage_collection", "generators", "lazy_evaluation"],
            "difficulty": "entry",
        },
        {
            "text": "Explain Python's Global Interpreter Lock (GIL). How does it influence multithreaded versus multiprocessing execution for CPU-bound tasks?",
            "expected_competencies": ["gil", "multiprocessing", "threading", "cpu_bound"],
            "difficulty": "mid",
        },
    ],
    "dsa": [
        {
            "text": "Explain how a Hash Table handles hash collisions. What are the time and space complexity differences between separate chaining and open addressing?",
            "expected_competencies": ["hash_table", "collisions", "chaining_vs_open_addressing", "amortized_time"],
            "difficulty": "entry",
        },
        {
            "text": "When would you select a Min-Heap (Priority Queue) over sorting an entire dataset? Walk through finding the K-th largest element in an unsorted array.",
            "expected_competencies": ["min_heap", "priority_queue", "time_complexity", "kth_element"],
            "difficulty": "mid",
        },
    ],
    "sql_dbms": [
        {
            "text": "Explain the difference between clustered and non-clustered B-Tree indexes. When might the database query planner perform a full table scan even though an index exists?",
            "expected_competencies": ["b_tree_indexes", "clustered_vs_nonclustered", "query_planner", "cardinality"],
            "difficulty": "entry",
        },
        {
            "text": "What are the four ACID properties in relational databases, and what are the trade-offs between Read Committed and Serializable isolation levels?",
            "expected_competencies": ["acid", "isolation_levels", "phantom_reads", "concurrency"],
            "difficulty": "mid",
        },
    ],
    "data_science_stats": [
        {
            "text": "What is the interpretation of a p-value in hypothesis testing? How does increasing sample size influence statistical significance versus practical effect size?",
            "expected_competencies": ["p_value", "hypothesis_testing", "type_1_error", "effect_size"],
            "difficulty": "entry",
        },
    ],
    "mlops": [
        {
            "text": "What is the difference between data drift and concept drift in production ML models? How would you design a monitoring system when ground truth labels have delayed arrival?",
            "expected_competencies": ["data_drift", "concept_drift", "monitoring", "delayed_labels"],
            "difficulty": "entry",
        },
    ],
    "backend_sys_design": [
        {
            "text": "How would you design a distributed URL shortening service handling 10,000 writes per second? How would you handle database sharding and caching?",
            "expected_competencies": ["system_design", "sharding", "caching", "rate_limiting"],
            "difficulty": "entry",
        },
    ],
    "resume_defense": [
        {
            "text": "Walk me through the architecture of your primary machine learning project. What baseline model did you establish, and how did you measure success?",
            "expected_competencies": ["project_architecture", "baseline_comparison", "metric_evaluation"],
            "difficulty": "entry",
        },
    ],
    "behavioral": [
        {
            "text": "Tell me about a time when you disagreed with a technical design decision or faced an unexpected setback on a project. How did you resolve it?",
            "expected_competencies": ["star_format", "conflict_resolution", "ownership", "reflection"],
            "difficulty": "entry",
        },
    ],
}


class AdaptiveEngine:
    def get_initial_question(
        self,
        category: str,
        difficulty: str = "entry"
    ) -> Dict[str, Any]:
        """Select a curated foundational question for the chosen category and difficulty."""
        cat_key = category.lower().replace("-", "_").replace(" ", "_")
        bank = INITIAL_QUESTION_BANK.get(cat_key, INITIAL_QUESTION_BANK["ml_dl"])
        
        # Match by difficulty if possible, else take first
        match = next((q for q in bank if q.get("difficulty") == difficulty), bank[0])
        return {
            "question_text": match["text"],
            "category": category,
            "difficulty": difficulty,
            "question_type": "initial",
            "expected_competencies": match.get("expected_competencies", []),
            "rubric": {"version": "1.0", "category": category},
            "order_index": 0,
        }

    def generate_next_follow_up(
        self,
        current_question: Question,
        candidate_answer: str,
        evaluation: Evaluation,
        turn_index: int,
        remaining_budget: int,
    ) -> Dict[str, Any]:
        """
        Orchestrate stateful adaptive follow-up question generation.
        Directly targets the candidate's identified knowledge gaps and omissions.
        """
        missing_concepts = evaluation.missing_concepts or []
        overall_score = evaluation.overall_score
        category = current_question.category

        # Case 1: Candidate has identified gaps -> drill into the exact gap
        if missing_concepts:
            gap_item = missing_concepts[0]
            clean_gap = re.sub(r"^Did not cover\s*", "", gap_item, flags=re.IGNORECASE)
            
            question_text = (
                f"In your previous answer, you touched on the general approach. "
                f"How would you specifically handle {clean_gap} in a production environment?"
            )
            question_type = "conceptual_depth" if overall_score < 3.5 else "practical_application"
            follow_up_reason = f"Probing identified knowledge gap: {clean_gap}"

        # Case 2: Candidate had a strong answer (score >= 4.0) -> challenge with edge cases / trade-offs
        elif overall_score >= 4.0:
            question_text = (
                f"Your explanation was technically sound. What are the primary failure modes, edge cases, "
                f"or performance bottlenecks of this approach under extreme load or non-stationary data?"
            )
            question_type = "edge_cases"
            follow_up_reason = "Answer was comprehensive; escalating difficulty with edge cases."

        # Case 3: Candidate answer was brief or unclear -> request clarification
        else:
            question_text = (
                f"Can you clarify the trade-offs of the approach you proposed, "
                f"and explain what alternative technique you would consider if computational constraints were tightened?"
            )
            question_type = "trade_offs"
            follow_up_reason = "Exploring alternative architectural trade-offs."

        return {
            "question_text": question_text,
            "category": category,
            "difficulty": current_question.difficulty,
            "question_type": question_type,
            "parent_question_id": current_question.id,
            "follow_up_reason": follow_up_reason,
            "expected_competencies": current_question.expected_competencies or [],
            "rubric": {"version": "1.0", "parent_rubric": current_question.rubric},
            "order_index": turn_index,
        }

    def generate_summary_feedback(
        self,
        session: InterviewSession,
        all_evaluations: List[Evaluation],
    ) -> str:
        """Generate high-level synthesis of candidate performance across all turns."""
        if not all_evaluations:
            return "Interview completed. No detailed evaluations recorded."

        avg_score = sum(e.overall_score for e in all_evaluations) / len(all_evaluations)
        all_strengths = []
        all_gaps = []
        for e in all_evaluations:
            all_strengths.extend(e.strengths or [])
            all_gaps.extend(e.missing_concepts or [])

        # Deduplicate
        unique_strengths = list(dict.fromkeys(all_strengths))[:3]
        unique_gaps = list(dict.fromkeys(all_gaps))[:3]

        feedback_parts = [
            f"Candidate completed {len(all_evaluations)} question turns with an aggregate score of {avg_score:.1f}/5.0."
        ]

        if unique_strengths:
            feedback_parts.append("Key Demonstrated Strengths:")
            feedback_parts.extend([f"• {s}" for s in unique_strengths])

        if unique_gaps:
            feedback_parts.append("Priority Knowledge Gaps to Practice:")
            feedback_parts.extend([f"• {g}" for g in unique_gaps])

        return "\n".join(feedback_parts)


adaptive_engine = AdaptiveEngine()
