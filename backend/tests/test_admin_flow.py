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
os.environ["JWT_SECRET"] = "test_jwt_secret"
os.environ["DATA_HASH_KEY"] = "test_hash_key"

import pytest
from fastapi.testclient import TestClient
from backend.main import app
import backend.admin_router
import backend.stores.users_store
import backend.stores.demo_users_store
from pathlib import Path

client = TestClient(app)

# Mock admin token
ADMIN_TOKEN = "test_admin_token"

@pytest.fixture(autouse=True)
def clean_data():
    import shutil
    from pathlib import Path
    
    # Ensure backend is in path to access 'stores' module as main.py does
    sys.path.append(str(Path(__file__).parent.parent))
    
    try:
        import stores.users_store
        import stores.demo_users_store
    except ImportError:
        # Fallback if path hacking fails, though it shouldn't
        pass

    test_path = Path("test_data_admin")
    backend.pricing_router.PRICING_CONFIG_FILE = test_path / "pricing_config.json"
    backend.admin_router.DATA_DIR = test_path
    backend.admin_router.DEMO_REQUESTS_FILE = test_path / "demo_requests.json"
    backend.admin_router.ADMINS_FILE = test_path / "admins.json"
    backend.admin_router.USERS_FILE = test_path / "users.json"
    backend.stores.users_store.DATA_DIR = test_path
    backend.stores.users_store.USERS_FILE = test_path / "users.json"
    backend.stores.demo_users_store.DEMO_USERS_FILE = test_path / "demo_users.json"
    
    # Also update the 'stores' module variants
    if 'stores.users_store' in sys.modules:
        sys.modules['stores.users_store'].DATA_DIR = test_path
        sys.modules['stores.users_store'].USERS_FILE = test_path / "users.json"
    if 'stores.demo_users_store' in sys.modules:
        sys.modules['stores.demo_users_store'].DEMO_USERS_FILE = test_path / "demo_users.json"
    
    # Update admin_router in sys.modules if present (to ensure app sees it)
    if 'backend.admin_router' in sys.modules:
        mod = sys.modules['backend.admin_router']
        mod.DATA_DIR = test_path
        mod.DEMO_REQUESTS_FILE = test_path / "demo_requests.json"
        mod.ADMINS_FILE = test_path / "admins.json"
        mod.USERS_FILE = test_path / "users.json"
    
    if os.path.exists("test_data_admin"):
        shutil.rmtree("test_data_admin")
    os.makedirs("test_data_admin", exist_ok=True)
    yield
    if os.path.exists("test_data_admin"):
        shutil.rmtree("test_data_admin")

@pytest.fixture
def admin_headers():
    os.environ["ADMIN_TOKEN"] = ADMIN_TOKEN
    import admin_auth
    from backend.admin_auth import require_admin as require_admin_backend
    app.dependency_overrides[admin_auth.require_admin] = lambda: None
    app.dependency_overrides[require_admin_backend] = lambda: None
    try:
        yield {"Authorization": f"Bearer {ADMIN_TOKEN}"}
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
    # Setup initial data using store directly
    users = [
        {"email": "user1@example.com", "firstName": "User", "lastName": "One", "created_at": "2024-01-01T00:00:00Z"},
        {"email": "user2@example.com", "firstName": "User", "lastName": "Two", "created_at": "2024-01-02T00:00:00Z"}
    ]
    backend.stores.users_store.write_users(users)
    
    res = client.get("/admin/users", headers=admin_headers)
    assert res.status_code == 200
    users_resp = res.json()
    assert len(users_resp) == 2
    assert users_resp[0]["email"] == "user1@example.com"
    
    res = client.delete("/admin/users/user1@example.com", headers=admin_headers)
    assert res.status_code == 200
    
    # Verify persistence
    remaining = backend.stores.users_store.read_users()
    assert len(remaining) == 1
    assert remaining[0]["email"] == "user2@example.com"

def test_admin_demo_requests(admin_headers):
    # Setup initial data using file directly (since no store for requests yet, admin_router handles it)
    reqs = [
        {"id": "req1", "email": "demo1@example.com", "firstName": "Demo", "lastName": "One", "date": "2024-01-01"}
    ]
    with backend.admin_router.DEMO_REQUESTS_FILE.open("w") as f:
        json.dump(reqs, f)
        
    res = client.get("/admin/demo-requests", headers=admin_headers)
    assert res.status_code == 200
    resp_reqs = res.json()
    assert len(resp_reqs) == 1
    assert resp_reqs[0]["email"] == "demo1@example.com"
    
    res = client.post("/admin/demo-requests/req1/approve", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True
    
    # Verify request removed
    with backend.admin_router.DEMO_REQUESTS_FILE.open("r") as f:
        remaining = json.load(f)
    assert len(remaining) == 0
    
    # Verify demo user created
    demo_users = backend.stores.demo_users_store.read_demo_users()
    assert len(demo_users) == 1
    assert demo_users[0]["email"] == "demo1@example.com"
