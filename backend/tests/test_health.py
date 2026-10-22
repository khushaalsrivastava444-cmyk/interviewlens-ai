def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "InterviewLens AI API" in data["message"]
    assert "/api/v1/docs" in data["docs"]


def test_health_check_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "InterviewLens AI API"
    assert data["database"]["connected"] is True
