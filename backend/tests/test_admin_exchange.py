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
os.environ["SECRET_KEY"] = "test_secret_key_32_bytes_long_1234567890"
os.environ["ADMIN_PANEL_PASSWORD"] = "test_panel_password"
os.environ["DATA_HASH_KEY"] = "test_hash_key"
# Legacy env: admin panel no longer enforces MFA; kept to prove it is ignored.
os.environ["ADMIN_MFA_REQUIRED"] = "true"

from cryptography.fernet import Fernet

os.environ["DATA_ENCRYPTION_KEY"] = Fernet.generate_key().decode()

from main import app
from security import hash_password
from stores.pg_users_store import create_user

client = TestClient(app, base_url="https://testserver")


def _csrf_headers() -> dict:
    try:
        client.get("/")
    except Exception:
        pass
    token = client.cookies.get("csrf_token")
    return {"X-CSRF-Token": token} if token else {}


def _unlock_admin_panel(access_token: str) -> None:
    csrf = _csrf_headers()
    res = client.post(
        "/admin/panel-unlock",
        json={"password": "test_panel_password"},
        headers={"Authorization": f"Bearer {access_token}", **csrf},
    )
    assert res.status_code == 200


def _login(email: str, password: str) -> str:
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture
def admin_ctx():
    uid = create_user(
        {
            "email": "admin-exchange@example.com",
            "firstName": "Admin",
            "lastName": "One",
            "hashed_password": hash_password("StrongPassword123!"),
            "role": "admin",
            "is_active": True,
            "is_verified": True,
        }
    )
    token = _login("admin-exchange@example.com", "StrongPassword123!")
    return {"id": uid, "token": token}


@pytest.fixture
def user_access_token():
    create_user(
        {
            "email": "user-exchange@example.com",
            "firstName": "User",
            "lastName": "One",
            "hashed_password": hash_password("StrongPassword123!"),
            "role": "user",
            "is_active": True,
            "is_verified": True,
        }
    )
    return _login("user-exchange@example.com", "StrongPassword123!")


def test_admin_exchange_rejects_non_admin(user_access_token):
    csrf = _csrf_headers()
    res = client.post(
        "/admin/exchange",
        json={},
        headers={"Authorization": f"Bearer {user_access_token}", **csrf},
    )
    assert res.status_code == 403


def test_admin_exchange_returns_admin_token_without_mfa(admin_ctx):
    """Panel kilidi açıkken /admin/exchange doğrudan admin JWT döner (2FA yok)."""
    _unlock_admin_panel(admin_ctx["token"])
    csrf = _csrf_headers()
    res = client.post(
        "/admin/exchange",
        json={},
        headers={"Authorization": f"Bearer {admin_ctx['token']}", **csrf},
    )
    assert res.status_code == 200
    body = res.json()
    assert body.get("ok") is True
    assert body.get("token")
    assert body.get("mfa_setup_required") is not True


def test_panel_bootstrap_returns_admin_token_single_step(admin_ctx):
    """Tek istekte panel şifresi + admin JWT (2FA yok)."""
    csrf = _csrf_headers()
    res = client.post(
        "/admin/panel-bootstrap",
        json={"password": "test_panel_password"},
        headers={"Authorization": f"Bearer {admin_ctx['token']}", **csrf},
    )
    assert res.status_code == 200
    body = res.json()
    assert body.get("ok") is True
    assert body.get("token")
    assert body.get("mfa_setup_required") is not True


def test_admin_exchange_idempotent_second_call(admin_ctx):
    _unlock_admin_panel(admin_ctx["token"])
    csrf = _csrf_headers()
    res1 = client.post(
        "/admin/exchange",
        json={},
        headers={"Authorization": f"Bearer {admin_ctx['token']}", **csrf},
    )
    assert res1.status_code == 200
    res2 = client.post(
        "/admin/exchange",
        json={},
        headers={"Authorization": f"Bearer {admin_ctx['token']}", **csrf},
    )
    assert res2.status_code == 200
    assert res2.json().get("ok") is True
    assert res2.json().get("token")
