import pytest
import os
import concurrent.futures
from fastapi.testclient import TestClient
from main import app
from stores.pg_users_store import create_user, find_user_by_email
from security import hash_password

# Ensure test environment
os.environ["ENVIRONMENT"] = "test"

client = TestClient(app, base_url="https://testserver")

ADMIN_EMAIL = "conc_admin@test.com"
USER_EMAIL = "conc_user@test.com"
PASSWORD = "StrongPassword123!"

@pytest.fixture(autouse=True)
def setup_users():
    if not find_user_by_email(ADMIN_EMAIL):
        create_user({
            "email": ADMIN_EMAIL,
            "hashed_password": hash_password(PASSWORD),
            "firstName": "Admin",
            "lastName": "Conc",
            "role": "admin",
            "is_active": True
        })
    if not find_user_by_email(USER_EMAIL):
        create_user({
            "email": USER_EMAIL,
            "hashed_password": hash_password(PASSWORD),
            "firstName": "User",
            "lastName": "Conc",
            "role": "user",
            "is_active": True
        })

def test_concurrent_refresh_race_condition():
    """
    Test Refresh Token Race Condition Fix.
    We try to use the SAME refresh token 20 times concurrently.
    Only 1 should succeed (200), others should fail (401).
    """
    # 1. Login to get token
    # Get CSRF first
    csrf_res = client.get("/")
    csrf_token = csrf_res.cookies.get("csrf_token")
    headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}
    
    login_res = client.post("/api/auth/login", json={"email": USER_EMAIL, "password": PASSWORD}, headers=headers)
    assert login_res.status_code == 200
    refresh_token = login_res.cookies.get("refresh_token")
    assert refresh_token is not None
    
    # 2. Prepare concurrent requests
    def call_refresh():
        # Each request needs its own client to simulate parallel connections? 
        # TestClient is synchronous. To test concurrency we need threads but TestClient calls app directly.
        # However, app logic (DB) is what matters.
        # But TestClient runs in same thread usually.
        # We need to use `requests` against a running server OR rely on threaded DB pool behavior with TestClient?
        # TestClient with FastAPI runs in-process. If we use threads, we are calling the ASGI app from multiple threads.
        # Starlette TestClient is thread-safe?
        return client.post("/api/auth/refresh", cookies={"refresh_token": refresh_token, "csrf_token": csrf_token}, headers=headers)

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(call_refresh) for _ in range(20)]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())
            
    # 3. Analyze results
    success_count = sum(1 for r in results if r.status_code == 200)
    auth_fail_count = sum(1 for r in results if r.status_code == 401)
    rate_limit_count = sum(1 for r in results if r.status_code == 429)
    
    print(f"Concurrent Refresh Results: Success={success_count}, AuthFail={auth_fail_count}, RateLimit={rate_limit_count}")
    
    # We expect exactly 1 success (the winner of the race)
    # The rest should be 401 (lost race). Rate limit is disabled in test mode.
    assert success_count == 1
    assert auth_fail_count + rate_limit_count == 19

def test_db_connection_pool_stress():
    """
    Hammer a read endpoint concurrently to verify request handling doesn't crash.
    """
    def call_me():
        return client.get("/api/pricing/config")
        
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(call_me) for _ in range(100)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]
        
    status_codes = [r.status_code for r in results]
    assert all(s == 200 for s in status_codes)
