import pytest
import os
import uuid
from fastapi.testclient import TestClient
from backend.main import app
from backend.stores.pg_users_store import create_user, find_user_by_email, update_user_role, delete_user
from backend.security import hash_password, create_access_token
from backend.admin_auth import issue_admin_token

# Ensure we are in test mode
os.environ["ENVIRONMENT"] = "test"

# Use HTTPS for Secure cookies
client = TestClient(app, base_url="https://testserver")
client.headers["User-Agent"] = "MironTestBot/1.0"

ADMIN_EMAIL = "advanced_admin@test.com"
USER_EMAIL = "advanced_user@test.com"
PASSWORD = "StrongPassword123!"

@pytest.fixture(autouse=True)
def setup_data():
    # Setup Admin
    if not find_user_by_email(ADMIN_EMAIL):
        create_user({
            "email": ADMIN_EMAIL,
            "hashed_password": hash_password(PASSWORD),
            "firstName": "Admin",
            "lastName": "Advanced",
            "role": "admin",
            "is_active": True
        })
    else:
        update_user_role(ADMIN_EMAIL, "admin")
        
    # Setup User
    if not find_user_by_email(USER_EMAIL):
        create_user({
            "email": USER_EMAIL,
            "hashed_password": hash_password(PASSWORD),
            "firstName": "User",
            "lastName": "Advanced",
            "role": "user",
            "is_active": True
        })
    else:
        update_user_role(USER_EMAIL, "user")

    # Setup CSRF
    res = client.get("/")
    token = res.cookies.get("csrf_token")
    if token:
        client.headers["X-CSRF-Token"] = token

def get_admin_headers():
    user = find_user_by_email(ADMIN_EMAIL)
    token = issue_admin_token(str(user["id"]))
    return {"Authorization": f"Bearer {token}"}

def test_admin_list_users():
    headers = get_admin_headers()
    res = client.get("/admin/users", headers=headers)
    assert res.status_code == 200
    users = res.json()
    assert isinstance(users, list)
    assert len(users) >= 2

def test_admin_lock_unlock_user():
    headers = get_admin_headers()
    user = find_user_by_email(USER_EMAIL)
    user_id = str(user["id"])
    
    # Lock
    res = client.post(f"/admin/users/{user_id}/lock", headers=headers)
    assert res.status_code == 200
    
    # Verify Locked
    user_fresh = find_user_by_email(USER_EMAIL)
    assert user_fresh["locked_until"] is not None
    
    # Unlock
    res = client.post(f"/admin/users/{user_id}/unlock", headers=headers)
    assert res.status_code == 200
    
    # Verify Unlocked
    user_fresh = find_user_by_email(USER_EMAIL)
    assert user_fresh["locked_until"] is None

def test_admin_reset_password():
    headers = get_admin_headers()
    user = find_user_by_email(USER_EMAIL)
    user_id = str(user["id"])
    
    new_pw = "NewPassword123!"
    res = client.post(f"/admin/users/{user_id}/reset-password", json={"password": new_pw}, headers=headers)
    assert res.status_code == 200
    
    # Verify login with new password
    # Login endpoint uses standard auth
    login_res = client.post("/api/auth/login", json={"email": USER_EMAIL, "password": new_pw})
    assert login_res.status_code == 200

def test_admin_suspend_user():
    headers = get_admin_headers()
    
    # Suspend
    res = client.put(f"/admin/users/{USER_EMAIL}/suspend", json={"active": False}, headers=headers)
    assert res.status_code == 200
    assert res.json()["is_active"] is False
    
    user = find_user_by_email(USER_EMAIL)
    assert user["is_active"] is False
    
    # Unsuspend
    res = client.put(f"/admin/users/{USER_EMAIL}/suspend", json={"active": True}, headers=headers)
    assert res.status_code == 200
    assert res.json()["is_active"] is True

def test_admin_audit_logs():
    headers = get_admin_headers()
    res = client.get("/admin/audit-logs", headers=headers)
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
    # Should have some logs from setup or previous tests
    
def test_admin_stats():
    headers = get_admin_headers()
    res = client.get("/admin/stats", headers=headers)
    assert res.status_code == 200
    stats = res.json()
    assert "total_users" in stats
    assert stats["total_users"] >= 2

def test_admin_system_logs():
    headers = get_admin_headers()
    res = client.get("/admin/logs/system", headers=headers)
    assert res.status_code == 200
    logs = res.json()
    assert "logs" in logs

def test_admin_create_delete_user():
    headers = get_admin_headers()
    new_email = f"temp_admin_test_{uuid.uuid4()}@test.com"
    
    # Create
    user_data = {
        "email": new_email,
        "password": "Password123!",
        "firstName": "Temp",
        "lastName": "User"
    }
    res = client.post("/admin/users", json=user_data, headers=headers)
    assert res.status_code == 200
    
    # Verify
    assert find_user_by_email(new_email) is not None
    
    # Delete
    res = client.delete(f"/admin/users/{new_email}", headers=headers)
    assert res.status_code == 200
    
    # Verify Deleted
    assert find_user_by_email(new_email) is None
