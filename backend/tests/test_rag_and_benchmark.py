import pytest
from fastapi.testclient import TestClient

from app.services.rag_service import hybrid_rag_engine
from app.services.benchmark_service import benchmark_service


def test_hybrid_rag_retrieval():
    # Query for ML data leakage
    results = hybrid_rag_engine.retrieve(
        query="data leakage prevention feature scaling fit transform",
        category="ml_dl",
        top_k=2,
    )
    assert len(results) >= 1
    top = results[0]
    assert top.category == "ml_dl"
    assert "leakage" in top.chunk_id
    assert top.similarity_score > 0.3
    assert top.hybrid_score > 0.3
    assert len(top.key_mechanisms) > 0


def test_rag_grounding_evaluation():
    high_answer = (
        "In cross validation, you must fit the scaler strictly inside the training fold using fit_transform, "
        "and only apply transform to the validation fold to avoid optimistic bias. Use a scikit-learn Pipeline."
    )
    grounding = hybrid_rag_engine.ground_evaluation(
        candidate_answer=high_answer,
        question_text="How do you prevent data leakage during feature scaling?",
        category="ml_dl",
    )
    assert grounding.semantic_coverage >= 0.5
    assert len(grounding.covered_mechanisms) > 0
    assert len(grounding.authoritative_citations) > 0


def test_benchmark_service_execution():
    result = benchmark_service.execute_benchmark()
    assert result.total_cases >= 4
    # Ensure monotonic scoring holds across all benchmark tiers
    assert result.monotonic_score_pass_rate == 100.0
    assert result.gap_detection_accuracy >= 80.0
    assert result.calibration_status == "CALIBRATED_OPTIMAL"
    assert result.mean_evaluation_latency_ms < 200.0  # Fast sub-200ms evaluation


def test_rag_api_endpoints(client: TestClient, auth_headers: dict):
    # 1. Retrieve knowledge chunks
    retrieval_res = client.post(
        "/api/v1/rag/retrieve",
        json={"query": "GIL Global Interpreter Lock multithreading CPU bound", "category": "python", "top_k": 2},
        headers=auth_headers,
    )
    assert retrieval_res.status_code == 200
    retrieval_data = retrieval_res.json()
    assert len(retrieval_data) >= 1
    assert "gil" in retrieval_data[0]["content"].lower()

    # 2. List knowledge corpus
    corpus_res = client.get("/api/v1/rag/knowledge-corpus", headers=auth_headers)
    assert corpus_res.status_code == 200
    corpus = corpus_res.json()
    assert len(corpus) >= 8

    # 3. Ground answer evaluation
    ground_res = client.post(
        "/api/v1/rag/ground",
        json={
            "candidate_answer": "CPython uses the GIL to protect memory management and reference counting.",
            "question_text": "What is the GIL?",
            "category": "python",
        },
        headers=auth_headers,
    )
    assert ground_res.status_code == 200
    ground_data = ground_res.json()
    assert "semantic_coverage" in ground_data
    assert len(ground_data["authoritative_citations"]) > 0

    # 4. Run Benchmark
    benchmark_res = client.post("/api/v1/rag/benchmark-run", headers=auth_headers)
    assert benchmark_res.status_code == 200
    bench_data = benchmark_res.json()
    assert bench_data["calibration_status"] == "CALIBRATED_OPTIMAL"
    assert bench_data["monotonic_score_pass_rate"] == 100.0
