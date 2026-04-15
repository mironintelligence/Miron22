
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
os.environ["JWT_SECRET"] = "test_jwt_secret_32_bytes_long_123456"
os.environ["DATA_HASH_KEY"] = "test_hash_key"
from cryptography.fernet import Fernet
os.environ["DATA_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

from fastapi.testclient import TestClient
from main import app
import security
security._JWT_SECRET = "test_jwt_secret_32_bytes_long_123456"
from auth_router import router

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_data():
    import shutil
    from pathlib import Path
    import pricing_router
    import admin_router
    import stores.users_store
    import stores.demo_users_store
    import services.pricing_service
    
    # Force DATA_DIR and FILES
    test_path = Path("test_data")
    pricing_router.DATA_DIR = test_path
    pricing_router.PRICING_CONFIG_FILE = test_path / "pricing_config.json"
    
    admin_router.DATA_DIR = test_path
    admin_router.DEMO_REQUESTS_FILE = test_path / "demo_requests.json"
    admin_router.ADMINS_FILE = test_path / "admins.json"
    admin_router.USERS_FILE = test_path / "users.json"
    
    stores.users_store.DATA_DIR = test_path
    stores.users_store.USERS_FILE = test_path / "users.json"
    
    stores.demo_users_store.DEMO_USERS_FILE = test_path / "demo_users.json"
    
    services.pricing_service.DATA_DIR = test_path
    services.pricing_service.DISCOUNT_CODES_FILE = test_path / "discount_codes.json"
    
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

@pytest.fixture(autouse=True)
def bypass_csrf():
    # Bypass CSRF for all tests
    async def mock_dispatch(self, request, call_next):
        return await call_next(request)
        
    with patch("middleware.csrf.CSRFProtectionMiddleware.dispatch", side_effect=mock_dispatch, autospec=True):
        yield

@pytest.fixture(autouse=True)
def mock_db_driver():
    old_db_url = os.environ.get("DATABASE_URL")
    old_env = os.environ.get("ENVIRONMENT")
    os.environ["ENVIRONMENT"] = "test"
    os.environ.pop("DATABASE_URL", None)
    with patch("psycopg2.connect") as mock_conn:
        mock_conn.return_value.cursor.return_value.execute.return_value = None
        mock_conn.return_value.cursor.return_value.fetchone.return_value = None
        
        # Patch the Pool class to return a mock pool
        with patch("psycopg2.pool.ThreadedConnectionPool") as mock_pool_cls:
            mock_pool = MagicMock()
            mock_pool.getconn.return_value = mock_conn.return_value
            mock_pool_cls.return_value = mock_pool
            try:
                yield
            finally:
                if old_db_url is not None:
                    os.environ["DATABASE_URL"] = old_db_url
                else:
                    os.environ.pop("DATABASE_URL", None)
                if old_env is not None:
                    os.environ["ENVIRONMENT"] = old_env
                else:
                    os.environ.pop("ENVIRONMENT", None)

@patch("pricing_router._save_config_to_db", MagicMock())
@patch("pricing_router._load_config_from_db", MagicMock(return_value=None))
@patch("admin_auth.SECRET_KEY", "test_secret_key_32_bytes_long_1234567890")
@patch("admin_auth.ALGORITHM", "HS256")
@patch("security._JWT_SECRET", "test_jwt_secret_32_bytes_long_123456")
def test_pricing_flow():
    import jwt
    from datetime import datetime, timedelta, timezone
    token = jwt.encode(
        {
            "sub": "admin_123",
            "role": "admin",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        },
        "test_secret_key_32_bytes_long_1234567890",
        algorithm="HS256",
    )
    res = client.post("/api/pricing/calculate", json={"count": 1})
    assert res.status_code == 200
    data = res.json()
    assert data["final_total"] == 6999.0
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
