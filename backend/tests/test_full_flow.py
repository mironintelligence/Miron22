
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
from backend.auth_router import _save_verification, _load_verification

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

def test_pricing_flow():
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
        headers={"Authorization": "Bearer secret_admin_token"}
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

@patch("backend.auth_router.get_supabase_client")
@patch("backend.auth_router._send_verification_email")
def test_auth_single_user_flow(mock_send_email, mock_supabase):
    # Mock Supabase responses
    mock_auth = MagicMock()
    mock_supabase.return_value.auth = mock_auth
    
    # Mock register response
    mock_auth.sign_up.return_value = {
        "user": {"id": "test_user_id", "email": "test@example.com"}
    }
    
    # Mock login response
    mock_auth.sign_in_with_password.return_value = {
        "session": {"access_token": "fake_jwt", "expires_in": 3600},
        "user": {"id": "test_user_id", "email": "test@example.com"}
    }

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
    assert res.json()["requires_verification"] is True
    
    # Verify email was "sent"
    mock_send_email.assert_called_once()
    
    # 2. Try to login (should fail)
    res = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert res.status_code == 403
    assert "verify" in res.json()["detail"].lower()

    # 3. Get verification token manually from file (since we mocked email sending)
    store = _load_verification()
    assert "test@example.com" in store
    token = store["test@example.com"]["token"]
    
    # 4. Verify email
    res = client.get(f"/api/auth/verify-email?token={token}", follow_redirects=False)
    assert res.status_code == 307 # Redirect
    assert "verified=1" in res.headers["location"]

    # 5. Login again (should succeed)
    res = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert res.status_code == 200
    assert res.json()["token"] == "fake_jwt"

@patch("backend.auth_router.get_supabase_client")
def test_auth_multi_user_flow(mock_supabase):
    # Mock Supabase
    mock_auth = MagicMock()
    mock_supabase.return_value.auth = mock_auth
    mock_auth.sign_up.return_value = {"user": {"email": "multi@example.com"}}
    mock_auth.sign_in_with_password.return_value = {
        "session": {"access_token": "fake_jwt_multi"},
        "user": {"email": "multi@example.com"}
    }

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
