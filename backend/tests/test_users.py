def test_get_user_profile(client, auth_headers, test_user):
    response = client.get("/api/v1/users/profile", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == test_user.email
    assert "statistics" in data
    assert data["statistics"]["total_sessions"] == 0


def test_update_user_profile(client, auth_headers, test_user):
    payload = {
        "full_name": "Alexander Mercer Jr.",
        "target_role": "Senior ML Engineer",
        "experience_level": "mid"
    }
    response = client.put("/api/v1/users/profile", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Alexander Mercer Jr."
    assert data["target_role"] == "Senior ML Engineer"
    assert data["experience_level"] == "mid"


def test_profile_unauthorized_access(client):
    response = client.get("/api/v1/users/profile")
    assert response.status_code == 401
