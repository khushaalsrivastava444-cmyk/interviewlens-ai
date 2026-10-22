def test_register_user_success(client):
    payload = {
        "email": "newcandidate@example.com",
        "password": "Password123!",
        "full_name": "Jordan Lee",
        "target_role": "Backend Engineer",
        "experience_level": "entry"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "newcandidate@example.com"
    assert data["user"]["full_name"] == "Jordan Lee"
    assert data["user"]["target_role"] == "Backend Engineer"


def test_register_duplicate_email_fails(client, test_user):
    payload = {
        "email": test_user.email,
        "password": "AnotherPassword123!",
        "full_name": "Duplicate User",
        "target_role": "Data Scientist",
        "experience_level": "mid"
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_login_oauth2_success(client, test_user):
    form_data = {
        "username": test_user.email,
        "password": "TestSecure123!"
    }
    response = client.post("/api/v1/auth/login", data=form_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == test_user.email


def test_login_json_success(client, test_user):
    payload = {
        "email": test_user.email,
        "password": "TestSecure123!"
    }
    response = client.post("/api/v1/auth/login-json", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["id"] == test_user.id


def test_login_wrong_password_fails(client, test_user):
    payload = {
        "email": test_user.email,
        "password": "WrongPassword999!"
    }
    response = client.post("/api/v1/auth/login-json", json=payload)
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_get_current_user_me(client, auth_headers, test_user):
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_user.id
    assert data["email"] == test_user.email
    assert data["full_name"] == test_user.full_name


def test_get_current_user_unauthorized(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
