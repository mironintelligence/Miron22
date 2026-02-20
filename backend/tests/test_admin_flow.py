
import sys
from unittest.mock import MagicMock

# Mock dependencies to avoid import errors
sys.modules["pdfplumber"] = MagicMock()
sys.modules["docx"] = MagicMock()
sys.modules["openai"] = MagicMock()

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from backend.main import app

client = TestClient(app)

# Mock admin token
ADMIN_TOKEN = "test_admin_token"
@pytest.fixture
def admin_headers():
    # Ensure env token matches our header
    import os
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
    # 1. Get initial config
    res = client.get("/api/pricing/config")
    assert res.status_code == 200
    initial_config = res.json()
    
    # 2. Update config
    new_config = {
        "base_price": 9000,
        "discount_rate": 25,
        "bulk_threshold": 5
    }
    res = client.post("/api/pricing/config", json=new_config, headers=admin_headers)
    assert res.status_code == 200
    
    # 3. Verify update
    res = client.get("/api/pricing/config")
    assert res.status_code == 200
    updated_config = res.json()
    assert updated_config["base_price"] == 9000
    assert updated_config["discount_rate"] == 25
    assert updated_config["bulk_threshold"] == 5
    
    # 4. Revert changes (cleanup)
    client.post("/api/pricing/config", json=initial_config, headers=admin_headers)

@patch("admin_router._load_json")
@patch("admin_router._atomic_write_json")
def test_admin_user_management(mock_write, mock_load, admin_headers):
    # Mock user data
    mock_users = [
        {"email": "user1@example.com", "firstName": "User", "lastName": "One", "created_at": "2024-01-01T00:00:00Z"},
        {"email": "user2@example.com", "firstName": "User", "lastName": "Two", "created_at": "2024-01-02T00:00:00Z"}
    ]
    mock_load.return_value = mock_users
    
    # 1. List users
    res = client.get("/admin/users", headers=admin_headers)
    assert res.status_code == 200
    users = res.json()
    assert len(users) == 2
    assert users[0]["email"] == "user1@example.com"
    
    # 2. Delete user
    # Simulate delete by filtering the list in the mock call logic would be complex, 
    # so we just check if the endpoint calls write with the filtered list.
    
    res = client.delete("/admin/users/user1@example.com", headers=admin_headers)
    assert res.status_code == 200
    
    # Verify one of the write calls targeted users.json with the user removed
    found_users_write = False
    for call in mock_write.call_args_list:
        path_arg, data_arg = call[0][0], call[0][1]
        if str(path_arg).endswith("users.json"):
            assert len(data_arg) == 1
            assert data_arg[0]["email"] == "user2@example.com"
            found_users_write = True
            break
    assert found_users_write

@patch("admin_router._load_json")
@patch("admin_router._atomic_write_json")
def test_admin_demo_requests(mock_write, mock_load, admin_headers):
    # Mock demo requests
    mock_requests = [
        {"id": "req1", "email": "demo1@example.com", "name": "Demo One", "date": "2024-01-01"}
    ]
    mock_load.side_effect = lambda path, default: mock_requests if "demo_requests" in str(path) else []
    
    # 1. List requests
    res = client.get("/admin/demo-requests", headers=admin_headers)
    assert res.status_code == 200
    reqs = res.json()
    assert len(reqs) == 1
    assert reqs[0]["email"] == "demo1@example.com"
    
    # 2. Approve request
    res = client.post("/admin/demo-requests/req1/approve", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["ok"] is True
    
    # Verify writes targeted both demo_users.json and demo_requests.json
    wrote_demo_users = False
    wrote_demo_requests = False
    for call in mock_write.call_args_list:
        path_arg = call[0][0]
        if str(path_arg).endswith("demo_users.json"):
            wrote_demo_users = True
        if str(path_arg).endswith("demo_requests.json"):
            wrote_demo_requests = True
    assert wrote_demo_users and wrote_demo_requests
