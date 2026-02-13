
import os
import json
import pytest
from unittest.mock import patch, MagicMock
import sys

# Mock modules that are not installed but imported in main.py
sys.modules["pdfplumber"] = MagicMock()
sys.modules["docx"] = MagicMock()
sys.modules["docx.shared"] = MagicMock()
sys.modules["docx.enum.text"] = MagicMock()
sys.modules["openai"] = MagicMock()

mock_openai_client = MagicMock()
mock_openai_client.get_openai_api_key.return_value = "sk-fake-key-123456"
sys.modules["openai_client"] = mock_openai_client

# Set env vars for testing
os.environ["ADMIN_TOKEN"] = "secret_admin_token"
os.environ["DATA_DIR"] = "test_data"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_KEY"] = "test_key"

from fastapi.testclient import TestClient
from backend.main import app
from backend.auth_router import router

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_data():
    # Clean up test data before/after
    import shutil
    if os.path.exists("test_data"):
        shutil.rmtree("test_data")
    os.makedirs("test_data", exist_ok=True)
    yield
    if os.path.exists("test_data"):
        shutil.rmtree("test_data")

@patch("backend.admin_auth.SECRET_KEY", "test_secret_key")
@patch("backend.admin_auth.ALGORITHM", "HS256")
def test_pricing_flow():
    # 0. Generate a valid admin token for the test
    import jwt
    from datetime import datetime, timedelta, timezone
    
    token = jwt.encode({
        "sub": "admin_123",
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }, "test_secret_key", algorithm="HS256")

    # 1. Check default pricing
    res = client.post("/api/pricing/calculate", json={"count": 1})
    assert res.status_code == 200
    data = res.json()
    assert data["final_total"] == 8000.0

    # 2. Admin updates pricing
    new_config = {
        "base_price": 10000.0,
        "discount_rate": 25.0,
        "bulk_threshold": 5
    }
    res = client.post(
        "/api/pricing/config", 
        json=new_config,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200

    # 3. Check new pricing for single user
    res = client.post("/api/pricing/calculate", json={"count": 1})
    assert res.json()["final_total"] == 10000.0

    # 4. Check bulk discount (threshold 5)
    # 4 users -> no discount
    res = client.post("/api/pricing/calculate", json={"count": 4})
    assert res.json()["is_discounted"] is False
    assert res.json()["final_total"] == 40000.0

    # 5 users -> discount applied (25%)
    res = client.post("/api/pricing/calculate", json={"count": 5})
    assert res.json()["is_discounted"] is True
    # 5 * 10000 = 50000. Discount 25% = 12500. Total = 37500.
    assert res.json()["final_total"] == 37500.0

@patch("backend.auth_router._read_users")
@patch("backend.auth_router._write_users")
def test_auth_single_user_flow(mock_write_users, mock_read_users):
    # Mock data store
    mock_users = []
    mock_read_users.side_effect = lambda: mock_users
    def save_users(users):
        mock_users[:] = users
    mock_write_users.side_effect = save_users

    # 1. Register
    payload = {
        "email": "test@example.com",
        "password": "password123",
        "firstName": "Test",
        "lastName": "User",
        "mode": "single"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200
    assert res.json()["requires_verification"] is False
    
    # 2. Login
    res = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert res.status_code == 200
    assert "token" in res.json()
    
    # 3. Wrong password
    res = client.post("/api/auth/login", json={"email": "test@example.com", "password": "wrong"})
    assert res.status_code == 401

@patch("backend.auth_router._read_users")
@patch("backend.auth_router._write_users")
def test_auth_multi_user_flow(mock_write_users, mock_read_users):
    # Mock data store
    mock_users = []
    mock_read_users.side_effect = lambda: mock_users
    def save_users(users):
        mock_users[:] = users
    mock_write_users.side_effect = save_users

    # 1. Register Multi
    payload = {
        "email": "multi@example.com",
        "password": "password123",
        "firstName": "Multi",
        "lastName": "User",
        "mode": "multi"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200
    assert res.json()["requires_verification"] is False

    # 2. Login immediately (should succeed)
    res = client.post("/api/auth/login", json={"email": "multi@example.com", "password": "password123"})
    assert res.status_code == 200
