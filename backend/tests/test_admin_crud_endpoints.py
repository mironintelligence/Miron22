import os
import sys
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

sys.modules["pdfplumber"] = MagicMock()
sys.modules["docx"] = MagicMock()
sys.modules["openai"] = MagicMock()

os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "test_jwt_secret_32_bytes_long_123456"
os.environ["DATA_HASH_KEY"] = "test_hash_key"
os.environ["ADMIN_MFA_REQUIRED"] = "true"

from cryptography.fernet import Fernet

os.environ["DATA_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

from main import app
from security import hash_password
from stores.pg_users_store import create_user, set_user_mfa, find_user_by_email
from utils.totp import totp_code

client = TestClient(app, base_url="https://testserver")
client.headers["User-Agent"] = "MironTestBot/1.0"


def _csrf_headers() -> dict:
    client.get("/api/health")
    token = client.cookies.get("csrf_token")
    return {"X-CSRF-Token": token} if token else {}


def _login(email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture
def admin_token():
    uid = create_user(
        {
            "email": "admin-crud@example.com",
            "firstName": "Admin",
            "lastName": "Crud",
            "hashed_password": hash_password("StrongPassword123!"),
            "role": "admin",
            "is_active": True,
            "is_verified": True,
        }
    )
    set_user_mfa(uid, "JBSWY3DPEHPK3PXP", enabled=True)
    access = _login("admin-crud@example.com", "StrongPassword123!")
    csrf = _csrf_headers()
    otp = totp_code("JBSWY3DPEHPK3PXP")
    res = client.post("/admin/exchange", json={"otp": otp}, headers={"Authorization": f"Bearer {access}", **csrf})
    assert res.status_code == 200
    return res.json()["token"]


def test_admin_user_crud(admin_token):
    csrf = _csrf_headers()

    res = client.post(
        "/admin/users",
        json={"username": "Demo One", "email": "demo1@example.com", "password": "StrongPassword123!", "role": "user", "is_active": True},
        headers={"Authorization": f"Bearer {admin_token}", **csrf},
    )
    assert res.status_code == 200
    assert res.json().get("ok") is True

    res = client.put(
        "/admin/users/demo1@example.com/role",
        json={"role": "demo"},
        headers={"Authorization": f"Bearer {admin_token}", **csrf},
    )
    assert res.status_code == 200
    assert res.json().get("role") == "demo"

    res = client.put(
        "/admin/users/demo1@example.com/suspend",
        json={"active": False},
        headers={"Authorization": f"Bearer {admin_token}", **csrf},
    )
    assert res.status_code == 200
    assert res.json().get("is_active") is False

    res = client.delete("/admin/users/demo1@example.com", headers={"Authorization": f"Bearer {admin_token}", **csrf})
    assert res.status_code == 200
    assert res.json().get("ok") is True
    assert find_user_by_email("demo1@example.com") is None


def test_admin_config_update(admin_token):
    csrf = _csrf_headers()

    res = client.get("/admin/config", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    cfg = res.json().get("config") or {}

    cfg["maintenance_mode"] = not bool(cfg.get("maintenance_mode"))
    res2 = client.post("/admin/config", json=cfg, headers={"Authorization": f"Bearer {admin_token}", **csrf})
    assert res2.status_code == 200
    assert res2.json().get("ok") is True

