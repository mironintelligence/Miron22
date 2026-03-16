import sys
from unittest.mock import MagicMock
import os
import json

# Mock dependencies to avoid import errors
sys.modules["pdfplumber"] = MagicMock()
sys.modules["docx"] = MagicMock()
sys.modules["openai"] = MagicMock()

# Set env vars BEFORE importing app
from cryptography.fernet import Fernet
os.environ["DATA_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
os.environ["JWT_SECRET"] = "test_jwt_secret_32_bytes_long_123456"
os.environ["DATA_HASH_KEY"] = "test_hash_key"

import pytest
from fastapi.testclient import TestClient
from main import app
import admin_router
import pricing_router
from stores.pg_users_store import create_user, find_user_by_email, update_user_role
from security import hash_password

client = TestClient(app, base_url="https://testserver")

# Mock admin token
ADMIN_TOKEN = "test_admin_token"

@pytest.fixture(autouse=True)
def clean_data():
    import shutil
    from pathlib import Path

    test_path = Path("test_data_admin")
    pricing_router.PRICING_CONFIG_FILE = test_path / "pricing_config.json"

    if os.path.exists(str(test_path)):
        shutil.rmtree(str(test_path))
    os.makedirs(str(test_path), exist_ok=True)
    yield
    if os.path.exists(str(test_path)):
        shutil.rmtree(str(test_path))

@pytest.fixture
def admin_headers():
    os.environ["ADMIN_TOKEN"] = ADMIN_TOKEN
    import admin_auth
    from admin_auth import require_admin as require_admin_backend
    fake_admin = {"admin_id": "test-admin", "role": "admin", "jti": "test-jti"}
    app.dependency_overrides[admin_auth.require_admin] = lambda: fake_admin
    app.dependency_overrides[require_admin_backend] = lambda: fake_admin
    try:
        res = client.get("/")
        token = client.cookies.get("csrf_token")
        headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
        if token:
            headers["X-CSRF-Token"] = token
        yield headers
    finally:
        app.dependency_overrides.pop(admin_auth.require_admin, None)
        app.dependency_overrides.pop(require_admin_backend, None)

def test_admin_pricing_config(admin_headers):
    res = client.get("/api/pricing/config")
    assert res.status_code == 200
    
    new_config = {"base_price": 9000, "discount_rate": 25, "bulk_threshold": 5}
    res = client.post("/api/pricing/config", json=new_config, headers=admin_headers)
    assert res.status_code == 200
    
    res = client.get("/api/pricing/config")
    assert res.status_code == 200
    updated_config = res.json()
    assert updated_config["base_price"] == 9000

def test_admin_user_management(admin_headers):
    if not find_user_by_email("user1@example.com"):
        create_user(
            {
                "email": "user1@example.com",
                "firstName": "User",
                "lastName": "One",
                "hashed_password": hash_password("StrongPassword123!"),
                "role": "user",
                "is_active": True,
            }
        )
    if not find_user_by_email("user2@example.com"):
        create_user(
            {
                "email": "user2@example.com",
                "firstName": "User",
                "lastName": "Two",
                "hashed_password": hash_password("StrongPassword123!"),
                "role": "user",
                "is_active": True,
            }
        )

    res = client.get("/admin/users", headers=admin_headers)
    assert res.status_code == 200
    users_resp = res.json()
    assert any(u.get("email") == "user1@example.com" for u in users_resp)

    res = client.delete("/admin/users/user1@example.com", headers=admin_headers)
    assert res.status_code == 200

def test_admin_demo_requests(admin_headers):
    res = client.post(
        "/api/demo-request",
        json={
            "firstName": "Demo",
            "lastName": "One",
            "email": "demo1@example.com",
            "phone": "5555555555",
            "note": "Test",
        },
        headers=admin_headers,
    )
    assert res.status_code in (200, 201)
    req_id = res.json().get("id")
    assert req_id

    res = client.get("/admin/demo-requests", headers=admin_headers)
    assert res.status_code == 200
    assert any(r.get("email") == "demo1@example.com" for r in res.json())

    res = client.post(f"/admin/demo-requests/{req_id}/approve", headers=admin_headers)
    assert res.status_code == 200
    assert res.json().get("ok") is True
