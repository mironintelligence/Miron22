
import os
import json
import pytest
from unittest.mock import patch, MagicMock
import sys

sys.modules["pdfplumber"] = MagicMock()
sys.modules["docx"] = MagicMock()
sys.modules["docx.shared"] = MagicMock()
sys.modules["docx.enum.text"] = MagicMock()
sys.modules["openai"] = MagicMock()

mock_openai_client = MagicMock()
mock_openai_client.get_openai_api_key.return_value = "sk-fake-key-123456"
sys.modules["openai_client"] = mock_openai_client

os.environ["ADMIN_TOKEN"] = "secret_admin_token"
os.environ["DATA_DIR"] = "test_data"
os.environ["SUPABASE_URL"] = "https://test.supabase.co"
os.environ["SUPABASE_KEY"] = "test_key"
os.environ["JWT_SECRET"] = "test_jwt_secret"
os.environ["DATA_HASH_KEY"] = "test_hash_key"
from cryptography.fernet import Fernet
os.environ["DATA_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

from fastapi.testclient import TestClient
from backend.main import app
import backend.security
backend.security._JWT_SECRET = "test_jwt_secret"
from backend.auth_router import router

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_data():
    import shutil
    from pathlib import Path
    import backend.pricing_router
    import backend.admin_router
    import backend.stores.users_store
    import backend.stores.demo_users_store
    import backend.services.pricing_service
    
    # Force DATA_DIR and FILES
    test_path = Path("test_data")
    backend.pricing_router.DATA_DIR = test_path
    backend.pricing_router.PRICING_CONFIG_FILE = test_path / "pricing_config.json"
    
    backend.admin_router.DATA_DIR = test_path
    backend.admin_router.DEMO_REQUESTS_FILE = test_path / "demo_requests.json"
    backend.admin_router.ADMINS_FILE = test_path / "admins.json"
    backend.admin_router.USERS_FILE = test_path / "users.json"
    
    backend.stores.users_store.DATA_DIR = test_path
    backend.stores.users_store.USERS_FILE = test_path / "users.json"
    
    backend.stores.demo_users_store.DEMO_USERS_FILE = test_path / "demo_users.json"
    
    backend.services.pricing_service.DATA_DIR = test_path
    backend.services.pricing_service.DISCOUNT_CODES_FILE = test_path / "discount_codes.json"
    
    # Also update the 'stores' module variants if they exist
    # Ensure backend is in path to access 'stores' module as main.py does
    sys.path.append(str(Path(__file__).parent.parent))
    try:
        import stores.users_store
        import stores.demo_users_store
    except ImportError:
        pass
        
    if 'stores.users_store' in sys.modules:
        sys.modules['stores.users_store'].DATA_DIR = test_path
        sys.modules['stores.users_store'].USERS_FILE = test_path / "users.json"
    if 'stores.demo_users_store' in sys.modules:
        sys.modules['stores.demo_users_store'].DEMO_USERS_FILE = test_path / "demo_users.json"
    
    if os.path.exists("test_data"):
        shutil.rmtree("test_data")
    os.makedirs("test_data", exist_ok=True)
    yield
    if os.path.exists("test_data"):
        shutil.rmtree("test_data")

@patch("backend.admin_auth.SECRET_KEY", "test_secret_key")
@patch("backend.admin_auth.ALGORITHM", "HS256")
@patch("backend.security._JWT_SECRET", "test_jwt_secret")
def test_pricing_flow():
    import jwt
    from datetime import datetime, timedelta, timezone
    token = jwt.encode(
        {
            "sub": "admin_123",
            "role": "admin",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        "test_secret_key",
        algorithm="HS256",
    )
    res = client.post("/api/pricing/calculate", json={"count": 1})
    assert res.status_code == 200
    data = res.json()
    assert data["final_total"] == 8000.0
    new_config = {
        "base_price": 12000.0,
        "discount_rate": 25.0,
        "bulk_threshold": 5,
    }
    res = client.post(
        "/api/pricing/config",
        json=new_config,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    res = client.post("/api/pricing/calculate", json={"count": 1})
    assert res.json()["final_total"] == 12000.0
    res = client.post("/api/pricing/calculate", json={"count": 4})
    body = res.json()
    assert body["is_discounted"] is False
    assert body["final_total"] == 48000.0
    res = client.post("/api/pricing/calculate", json={"count": 5})
    body = res.json()
    assert body["is_discounted"] is True
    assert body["final_total"] == 45000.0
    res = client.post(
        "/api/pricing/discount-codes",
        json={
            "code": "BARO10",
            "type": "percent",
            "value": 10.0,
            "max_usage": 1,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    res = client.post(
        "/api/pricing/calculate",
        json={"count": 1, "discount_code": "baro10"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["discount_code"] == "BARO10"
    assert data["discount_code_type"] == "percent"
    assert data["discount_code_amount"] == 1200.0
    assert res.status_code == 200
    res = client.post(
        "/api/pricing/calculate",
        json={"count": 1, "discount_code": "BARO10"},
    )
    assert res.status_code == 200 # Should still work as usage not incremented
    res = client.post(
        "/api/pricing/discount-codes",
        json={
            "code": "EXPIRED",
            "type": "fixed",
            "value": 1000.0,
            "max_usage": 10,
            "expires_at": "2000-01-01T00:00:00+00:00",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    res = client.post(
        "/api/pricing/calculate",
        json={"count": 1, "discount_code": "EXPIRED"},
    )
    assert res.status_code == 400

@patch("backend.security.encrypt_value", lambda v: v)
@patch("backend.security.decrypt_value", lambda v: v)
@patch("backend.auth_router.read_users")
@patch("backend.auth_router.write_users")
@patch("backend.security._JWT_SECRET", "test_jwt_secret")
def test_auth_single_user_flow(mock_write_users, mock_read_users):
    mock_users = []
    mock_read_users.side_effect = lambda: mock_users
    def save_users(users):
        mock_users[:] = users
    mock_write_users.side_effect = save_users

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
    
    res = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert res.status_code == 200
    assert "access_token" in res.json()
    
    res = client.post("/api/auth/login", json={"email": "test@example.com", "password": "wrong"})
    assert res.status_code == 401

@patch("backend.auth_router.read_users")
@patch("backend.auth_router.write_users")
@patch("backend.security._JWT_SECRET", "test_jwt_secret")
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
