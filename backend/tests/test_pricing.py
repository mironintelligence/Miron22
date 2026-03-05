import pytest
import os
import time
from fastapi.testclient import TestClient
from backend.main import app
from backend.stores.pg_users_store import create_user, find_user_by_email, update_user_role
from backend.security import hash_password, create_access_token
from backend.admin_auth import issue_admin_token
from backend.pricing_router import _save_config, DEFAULT_CONFIG
from backend.services.pricing_service import _save_discounts

# Ensure we are in test mode
os.environ["ENVIRONMENT"] = "test"

# Use HTTPS to ensure Secure cookies are sent
client = TestClient(app, base_url="https://testserver")
client.headers["User-Agent"] = "MironTestBot/1.0" # Avoid BotProtectionMiddleware

ADMIN_EMAIL = "pricing_admin@test.com"
USER_EMAIL = "pricing_user@test.com"
PASSWORD = "StrongPassword123!"

@pytest.fixture(autouse=True)
def setup_pricing_data():
    # Reset config
    _save_config(DEFAULT_CONFIG)
    _save_discounts([]) # Reset discounts
    
    # Setup Users
    if not find_user_by_email(ADMIN_EMAIL):
        create_user({
            "email": ADMIN_EMAIL,
            "hashed_password": hash_password(PASSWORD),
            "firstName": "Admin",
            "lastName": "Price",
            "role": "admin",
            "is_active": True
        })
    else:
        update_user_role(ADMIN_EMAIL, "admin")
        
    if not find_user_by_email(USER_EMAIL):
        create_user({
            "email": USER_EMAIL,
            "hashed_password": hash_password(PASSWORD),
            "firstName": "User",
            "lastName": "Price",
            "role": "user",
            "is_active": True
        })
    
    # Setup CSRF globally for the client
    res = client.get("/")
    token = res.cookies.get("csrf_token")
    if token:
        client.headers["X-CSRF-Token"] = token

def get_admin_headers():
    user = find_user_by_email(ADMIN_EMAIL)
    token = issue_admin_token(str(user["id"]))
    return {"Authorization": f"Bearer {token}"}

def get_user_headers():
    user = find_user_by_email(USER_EMAIL)
    token = create_access_token({"sub": USER_EMAIL, "role": "user", "uid": str(user["id"]), "tv": 1})
    return {"Authorization": f"Bearer {token}"}

# --- Phase 1: Coverage Tests ---

def test_get_config():
    res = client.get("/api/pricing/config")
    assert res.status_code == 200
    data = res.json()
    assert "base_price" in data
    assert data["base_price"] == 8000.0

def test_update_config_admin():
    headers = get_admin_headers()
    new_config = {
        "base_price": 9000.0,
        "discount_rate": 25.0,
        "bulk_threshold": 5
    }
    res = client.post("/api/pricing/config", json=new_config, headers=headers)
    if res.status_code == 403:
        print(f"DEBUG 403: {res.text}")
        print(f"DEBUG CLIENT HEADERS: {client.headers}")
    assert res.status_code == 200
    assert res.json()["config"]["base_price"] == 9000.0
    
    # Verify persistence
    res = client.get("/api/pricing/config")
    assert res.json()["base_price"] == 9000.0

def test_update_config_user_fail():
    headers = get_user_headers()
    new_config = {
        "base_price": 1000.0,
        "discount_rate": 10.0,
        "bulk_threshold": 2
    }
    res = client.post("/api/pricing/config", json=new_config, headers=headers)
    assert res.status_code == 403

def test_update_config_validation_fail():
    headers = get_admin_headers()
    # Invalid: base_price <= 0
    res = client.post("/api/pricing/config", json={"base_price": -100, "discount_rate": 20, "bulk_threshold": 3}, headers=headers)
    assert res.status_code == 422

def test_calculate_simple():
    # 1 item, no bulk
    res = client.post("/api/pricing/calculate", json={"count": 1})
    assert res.status_code == 200
    data = res.json()
    assert data["raw_total"] == 8000.0
    assert data["final_total"] == 8000.0
    assert data["is_discounted"] is False

def test_calculate_bulk():
    # 3 items (threshold is 3 by default) -> 20% off
    res = client.post("/api/pricing/calculate", json={"count": 3})
    assert res.status_code == 200
    data = res.json()
    expected_raw = 3 * 8000.0 # 24000
    expected_discount = 24000 * 0.20 # 4800
    assert data["raw_total"] == expected_raw
    assert data["discount_amount"] == expected_discount
    assert data["final_total"] == 24000 - 4800
    assert data["is_discounted"] is True

def test_calculate_invalid_code():
    res = client.post("/api/pricing/calculate", json={"count": 1, "discount_code": "INVALID"})
    assert res.status_code == 400
    assert res.json()["detail"] == "invalid_discount_code"

def test_discount_codes_lifecycle():
    headers = get_admin_headers()
    
    # 1. Create Code
    code_data = {
        "code": "SUMMER2024",
        "type": "percent",
        "value": 15.0,
        "max_usage": 100,
        "description": "Summer Sale"
    }
    res = client.post("/api/pricing/discount-codes", json=code_data, headers=headers)
    assert res.status_code == 200
    
    # 2. List Codes
    res = client.get("/api/pricing/discount-codes", headers=headers)
    assert res.status_code == 200
    codes = res.json()
    assert len(codes) > 0
    assert any(c["code"] == "SUMMER2024" for c in codes)
    
    # 3. Calculate with Code
    # 1 item: 8000. Discount 15% -> 1200 off.
    res = client.post("/api/pricing/calculate", json={"count": 1, "discount_code": "summer2024"}) # Case insensitive
    assert res.status_code == 200
    data = res.json()
    assert data["discount_code"] == "SUMMER2024"
    assert data["discount_code_amount"] == 1200.0
    assert data["final_total"] == 6800.0
    
    # 4. Toggle Code (Deactivate)
    res = client.post("/api/pricing/discount-codes/SUMMER2024/toggle", json={"active": False}, headers=headers)
    assert res.status_code == 200
    assert res.json()["active"] is False
    
    # 5. Calculate again (should fail)
    res = client.post("/api/pricing/calculate", json={"count": 1, "discount_code": "SUMMER2024"})
    assert res.status_code == 400 # Invalid because inactive

# --- Phase 2: Edge Cases ---

def test_calculate_huge_numbers():
    # Integer overflow check (Python handles large ints, but float precision might vary)
    res = client.post("/api/pricing/calculate", json={"count": 1000000})
    assert res.status_code == 200
    data = res.json()
    assert data["count"] == 1000000

def test_calculate_negative():
    # Pydantic validation
    res = client.post("/api/pricing/calculate", json={"count": -5})
    assert res.status_code == 422

def test_create_discount_invalid_type():
    headers = get_admin_headers()
    res = client.post("/api/pricing/discount-codes", json={
        "code": "BADTYPE",
        "type": "random", # Invalid
        "value": 10
    }, headers=headers)
    assert res.status_code == 422

def test_create_discount_fixed_amount():
    headers = get_admin_headers()
    res = client.post("/api/pricing/discount-codes", json={
        "code": "FIXED500",
        "type": "fixed",
        "value": 500.0
    }, headers=headers)
    assert res.status_code == 200
    
    # Calculate
    res = client.post("/api/pricing/calculate", json={"count": 1, "discount_code": "FIXED500"})
    data = res.json()
    assert data["discount_code_amount"] == 500.0
    assert data["final_total"] == 7500.0 # 8000 - 500

