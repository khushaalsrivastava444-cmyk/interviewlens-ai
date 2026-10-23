from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.api import deps
from app.models.user import User
from app.services.rag_service import (
    hybrid_rag_engine,
    RetrievalResult,
    GroundingEvaluation,
    KnowledgeChunk,
    AUTHORITATIVE_CORPUS,
)
from app.services.benchmark_service import benchmark_service, BenchmarkRunResult

router = APIRouter()


class RetrievalRequest(BaseModel):
    query: str = Field(..., min_length=3)
    category: Optional[str] = None
    top_k: int = Field(default=3, ge=1, le=10)


class GroundingRequest(BaseModel):
    candidate_answer: str = Field(..., min_length=5)
    question_text: str = Field(..., min_length=5)
    category: str


@router.post("/retrieve", response_model=List[RetrievalResult])
def retrieve_knowledge_chunks(
    request: RetrievalRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Execute hybrid semantic + lexical search across authoritative engineering documentation.
    Combines dense TF-IDF vector similarity with sparse token matching.
    """
    results = hybrid_rag_engine.retrieve(
        query=request.query,
        category=request.category,
        top_k=request.top_k,
    )
    return results


@router.get("/knowledge-corpus", response_model=List[Dict[str, Any]])
def list_knowledge_corpus(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """List all authoritative technical reference topics and metadata in the RAG knowledge corpus."""
    return [
        {
            "id": item["id"],
            "category": item["category"],
            "topic": item["topic"],
            "title": item["title"],
            "content": item["content"],
            "key_mechanisms": item["key_mechanisms"],
        }
        for item in AUTHORITATIVE_CORPUS
    ]


@router.post("/ground", response_model=GroundingEvaluation)
def ground_answer_evaluation(
    request: GroundingRequest,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Compare a candidate answer against authoritative documentation chunks.
    Returns semantic coverage ratio, covered mechanisms, omitted mechanisms, and citations.
    """
    grounding = hybrid_rag_engine.ground_evaluation(
        candidate_answer=request.candidate_answer,
        question_text=request.question_text,
        category=request.category,
    )
    return grounding


@router.post("/benchmark-run", response_model=BenchmarkRunResult)
def run_evaluation_benchmark(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Execute the automated evaluation benchmark suite across High, Medium, and Low competency tiers.
    Verifies score monotonicity, gap detection accuracy, and evaluation latency.
    """
    result = benchmark_service.execute_benchmark()
    return result
