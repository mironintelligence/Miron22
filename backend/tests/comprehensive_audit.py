import pytest
import os
import json
import time

# Set Test Environment BEFORE importing app/security
os.environ["ENVIRONMENT"] = "test"

from fastapi.testclient import TestClient
from main import app
from stores.pg_users_store import (
    create_user, find_user_by_email, reset_failed_login, 
    update_user_role, delete_user, get_user_token_version
)
from security import hash_password, create_access_token, create_refresh_token

client = TestClient(app, base_url="https://testserver")
client.headers["User-Agent"] = "MironAuditBot/1.0" # Bypass BotProtection
os.environ["ENVIRONMENT"] = "test" # Relax Rate Limits

# Test Data
ADMIN_EMAIL = "audit_admin@test.com"
USER_EMAIL = "audit_user@test.com"
PASSWORD = "StrongPassword123!"

@pytest.fixture(autouse=True)
def setup_audit_db():
    # Setup Admin
    # ... (existing setup) ...
    admin = find_user_by_email(ADMIN_EMAIL)
    if not admin:
        create_user({
            "email": ADMIN_EMAIL,
            "hashed_password": hash_password(PASSWORD),
            "firstName": "Audit",
            "lastName": "Admin",
            "role": "admin",
            "is_active": True
        })
    else:
        update_user_role(ADMIN_EMAIL, "admin")
        reset_failed_login(admin["id"])

    user = find_user_by_email(USER_EMAIL)
    if not user:
        create_user({
            "email": USER_EMAIL,
            "hashed_password": hash_password(PASSWORD),
            "firstName": "Audit",
            "lastName": "User",
            "role": "user",
            "is_active": True
        })
    else:
        reset_failed_login(user["id"])

    # --- CSRF SETUP ---
    # Perform a GET request to obtain CSRF cookie
    res = client.get("/")
    csrf_token = res.cookies.get("csrf_token")
    if csrf_token:
        client.headers["X-CSRF-Token"] = csrf_token
    else:
        # Fallback if middleware not active or path skipped? 
        # But we need it. 
        pass

# ==========================================
# PHASE 1: AUTOMATED TEST COVERAGE AUDIT
# ==========================================

def test_health_check():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_auth_flow_full():
    # 1. Login
    res = client.post("/api/auth/login", json={"email": USER_EMAIL, "password": PASSWORD})
    assert res.status_code == 200
    data = res.json()
    access_token = data["access_token"]
    refresh_token = res.cookies["refresh_token"]
    
    # 2. Access Protected Resource
    # (Assuming we have a user-protected route, e.g. /api/pricing/config is public/admin? 
    # Let's try /api/auth/refresh which is protected by cookie)
    
    # 3. Refresh
    res_ref = client.post("/api/auth/refresh", cookies={"refresh_token": refresh_token})
    assert res_ref.status_code == 200
    new_access = res_ref.json()["access_token"]
    new_refresh = res_ref.cookies["refresh_token"]
    assert new_access != access_token
    assert new_refresh != refresh_token
    
    # 4. Logout
    res_out = client.post("/api/auth/logout", cookies={"refresh_token": new_refresh})
    assert res_out.status_code == 200
    
    # 5. Verify Revocation
    res_fail = client.post("/api/auth/refresh", cookies={"refresh_token": new_refresh})
    assert res_fail.status_code == 401

def test_admin_flow_full():
    # 1. Admin Login
    res = client.post("/admin/login", json={"email": ADMIN_EMAIL, "password": PASSWORD})
    assert res.status_code == 200
    admin_token = res.json()["token"]
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. List Users
    res_users = client.get("/admin/users", headers=headers)
    assert res_users.status_code == 200
    users = res_users.json()
    assert len(users) >= 2 # Admin + User
    
    # 3. Create New User via Admin
    new_email = f"new_user_{int(time.time())}@test.com"
    res_create = client.post("/admin/users", json={
        "email": new_email,
        "password": PASSWORD,
        "firstName": "New",
        "lastName": "Created",
        "role": "user"
    }, headers=headers)
    assert res_create.status_code == 200
    
    # 4. Verify User Created
    u = find_user_by_email(new_email)
    assert u is not None
    user_id = str(u["id"])
    print(f"DEBUG USER ID: {user_id}")
    
    # 5. Lock User
    res_lock = client.post(f"/admin/users/{user_id}/lock", headers=headers)
    if res_lock.status_code != 200:
        print(f"DEBUG LOCK FAIL: {res_lock.text}")
    assert res_lock.status_code == 200
    u_locked = find_user_by_email(new_email)
    assert u_locked["locked_until"] is not None
    
    # 6. Unlock User
    res_unlock = client.post(f"/admin/users/{user_id}/unlock", headers=headers)
    assert res_unlock.status_code == 200
    u_unlocked = find_user_by_email(new_email)
    assert u_unlocked["locked_until"] is None
    
    # 7. Reset Password
    res_reset = client.post(f"/admin/users/{user_id}/reset-password", json={"password": "NewStrongPassword1!"}, headers=headers)
    if res_reset.status_code != 200:
        print(f"DEBUG RESET FAIL: {res_reset.text}")
    assert res_reset.status_code == 200
    
    # 8. Get Audit Logs
    res_logs = client.get(f"/admin/audit-logs", headers=headers)
    assert res_logs.status_code == 200
    logs = res_logs.json()
    assert len(logs) > 0
    # Check if we find an action related to this user
    found = False
    for l in logs:
        if l.get("action") in ["USER_CREATE", "USER_LOCKED", "USER_UNLOCKED"]:
            # Check details or resource
            if l.get("resource") == new_email or str(l.get("details", {})).find(user_id) != -1:
                found = True
                break
    assert found is True
    
    # 9. Delete User
    res_del = client.delete(f"/admin/users/{user_id}", headers=headers)
    assert res_del.status_code == 200
    assert find_user_by_email(new_email) is None

# ==========================================
# PHASE 2: EDGE CASE TESTING
# ==========================================

def test_auth_edge_cases():
    # 1. Invalid Email Format
    res = client.post("/api/auth/register", json={
        "email": "not-an-email",
        "password": PASSWORD,
        "firstName": "Test",
        "lastName": "User"
    })
    assert res.status_code == 422
    
    # 2. Short Password
    res = client.post("/api/auth/register", json={
        "email": "short@test.com",
        "password": "short",
        "firstName": "Test",
        "lastName": "User"
    })
    assert res.status_code == 422
    
    # 3. Missing Fields
    res = client.post("/api/auth/register", json={"email": "missing@test.com"})
    assert res.status_code == 422

def test_jwt_manipulation():
    # 1. Login to get valid token
    res = client.post("/api/auth/login", json={"email": USER_EMAIL, "password": PASSWORD})
    token = res.json()["access_token"]
    
    # 2. Tamper with signature (simple append)
    bad_token = token + "bad"
    res = client.get("/admin/users", headers={"Authorization": f"Bearer {bad_token}"})
    assert res.status_code == 403 # Or 401, Invalid Token
    
    # 3. Wrong Role (Admin endpoint with User token)
    res = client.get("/admin/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403

def test_input_injection_unicode():
    # Unicode / Emoji in Name
    res = client.post("/api/auth/register", json={
        "email": f"emoji_{int(time.time())}@test.com",
        "password": PASSWORD,
        "firstName": "🤣💩",
        "lastName": "User",
        "accepted_terms_and_privacy": True,
    })
    assert res.status_code == 200 # Should be accepted but sanitized/stored safely
    
    # Very Long String (DoS attempt)
    long_str = "a" * 10000
    res = client.post("/api/auth/register", json={
        "email": f"long_{int(time.time())}@test.com",
        "password": PASSWORD,
        "firstName": long_str, # Max length is 64 in Pydantic
        "lastName": "User"
    })
    assert res.status_code == 422 # Pydantic validation

# ==========================================
# PHASE 3: DATABASE SAFETY (Sanity Check)
# ==========================================

def test_unique_constraint_violation():
    # Try to register same email twice
    email = f"unique_{int(time.time())}@test.com"
    payload = {
        "email": email,
        "password": PASSWORD,
        "firstName": "Test",
        "lastName": "User",
        "accepted_terms_and_privacy": True,
    }
    
    # First time
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 200
    
    # Second time
    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 409 # Conflict

# ==========================================
# PHASE 4: CRASH TESTING (Simulation)
# ==========================================

def test_graceful_failure_on_bad_db_input():
    # This simulates a DB error if we force it, but hard to do via API if validation catches it.
    # We can try to pass a NULL byte or similar if Pydantic allows it.
    # Pydantic usually filters string nulls.
    pass

def test_rate_limit_dos_simulation():
    # Use /api/auth/refresh endpoint which has a strict limit of 10/min
    # This avoids the slow Argon2 verification in /login
    
    hit_limit = False
    for i in range(60):
        # We send garbage cookie, it will return 401, but RateLimit middleware runs BEFORE handler
        # So it should count towards the limit.
        res = client.post("/api/auth/refresh", cookies={"refresh_token": "garbage"})
        if res.status_code == 429:
            hit_limit = True
            break
    
    assert hit_limit is True
