import sys
from unittest.mock import MagicMock
import os
import uuid

# Mock dependencies to avoid import errors during app import
sys.modules["pdfplumber"] = MagicMock()
sys.modules["docx"] = MagicMock()
sys.modules["openai"] = MagicMock()

# Set env vars BEFORE importing app
from cryptography.fernet import Fernet

os.environ["DATA_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
os.environ["JWT_SECRET"] = "test_jwt_secret_32_bytes_long_123456"
os.environ["DATA_HASH_KEY"] = "test_hash_key"
os.environ["SECRET_KEY"] = "test_secret_key_32_bytes_long_1234567890"

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app, base_url="https://testserver")

import contextlib
import routes.contract_routes as contract_routes


ADMIN_TOKEN = "test_admin_token"


@pytest.fixture(autouse=True)
def _cleanup_dependency_overrides():
    # Ensure no cross-test contamination
    yield
    app.dependency_overrides = {}


@pytest.fixture
def admin_headers():
    """Grants admin access for the duration of the test and cleans up the
    dependency overrides afterwards so that subsequent tests (e.g. the ones
    that verify `require_admin` actually rejects anonymous callers) see the
    real guard instead of the stub."""
    os.environ["ADMIN_TOKEN"] = ADMIN_TOKEN
    import admin_auth
    from admin_auth import require_admin as require_admin_backend

    fake_admin = {"admin_id": "test-admin", "role": "admin", "jti": "test-jti"}
    app.dependency_overrides[admin_auth.require_admin] = lambda: fake_admin
    app.dependency_overrides[require_admin_backend] = lambda: fake_admin

    client.get("/")
    token = client.cookies.get("csrf_token")
    headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    if token:
        headers["X-CSRF-Token"] = token

    try:
        yield headers
    finally:
        app.dependency_overrides.pop(admin_auth.require_admin, None)
        app.dependency_overrides.pop(require_admin_backend, None)


@pytest.fixture
def created_template_id(admin_headers):
    unique = uuid.uuid4().hex[:10].upper()
    payload = {
        "title": f"Test Template {unique}",
        "category": "Test",
        "content": "Madde 1: Örnek içerik.\nMadde 2: Örnek içerik 2.",
        "description": "description",
    }
    res = client.post("/api/contracts/templates", json=payload, headers=admin_headers)
    assert res.status_code == 200
    return res.json().get("id")


def test_admin_contract_template_crud(admin_headers):
    unique = uuid.uuid4().hex[:10].upper()
    payload = {
        "title": f"Admin CRUD Template {unique}",
        "category": "Test",
        "content": "Madde 1: İlk içerik.",
        "description": "initial",
    }
    create_res = client.post("/api/contracts/templates", json=payload, headers=admin_headers)
    assert create_res.status_code == 200
    template_id = create_res.json().get("id")
    assert template_id

    update_payload = {
        "title": f"Admin CRUD Template {unique} (Updated)",
        "category": "Test",
        "content": "Madde 1: Güncellenmiş içerik.",
        "description": "updated",
    }
    update_res = client.put(
        f"/api/contracts/templates/{template_id}",
        json=update_payload,
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json().get("ok") is True

    get_res = client.get(f"/api/contracts/templates/{template_id}")
    assert get_res.status_code == 200
    body = get_res.json()
    assert body.get("title") == update_payload["title"]
    assert body.get("content") == update_payload["content"]
    assert body.get("description") == update_payload["description"]

    delete_res = client.delete(f"/api/contracts/templates/{template_id}", headers=admin_headers)
    assert delete_res.status_code == 200
    assert delete_res.json().get("ok") is True

    get_after_delete = client.get(f"/api/contracts/templates/{template_id}")
    assert get_after_delete.status_code == 404


def test_admin_contract_template_requires_admin(created_template_id):
    """The `created_template_id` fixture uses admin_headers to create a
    row, but for this test we must exercise the *real* require_admin guard.
    The admin_headers fixture injects a dependency override that grants
    admin; we clear it here before issuing the unauthenticated request so
    the endpoint's real `Depends(require_admin)` is evaluated."""
    app.dependency_overrides = {}
    res = client.put(
        f"/api/contracts/templates/{created_template_id}",
        json={"title": "x", "category": "Test", "content": "y", "description": None},
    )
    assert res.status_code in (401, 403)


@pytest.fixture(autouse=True)
def mock_contract_templates_db(monkeypatch):
    # This repo’s tests can run without DATABASE_URL by mocking cursor operations.
    # We only mock the SQL patterns used by template CRUD endpoints.
    store = {"next_id": 1000, "templates": {}}

    class FakeCursor:
        def __init__(self):
            self._last = None

        def execute(self, sql, params=None):
            sql_l = str(sql or "").lower()
            params = params or ()

            if "insert into contract_templates" in sql_l:
                title, category, content, description = params
                tid = store["next_id"]
                store["next_id"] += 1
                store["templates"][tid] = {
                    "id": tid,
                    "title": title,
                    "category": category,
                    "content": content,
                    "description": description,
                }
                self._last = {"id": tid}
                return

            if "update contract_templates" in sql_l:
                title, category, content, description, tid = params
                tid = int(tid)
                if tid not in store["templates"]:
                    self._last = None
                    return
                store["templates"][tid].update(
                    {"title": title, "category": category, "content": content, "description": description}
                )
                self._last = {"id": tid}
                return

            if "delete from contract_templates" in sql_l:
                (tid,) = params[:1]
                tid = int(tid)
                if tid not in store["templates"]:
                    self._last = None
                    return
                store["templates"].pop(tid, None)
                self._last = {"id": tid}
                return

            if "select * from contract_templates where id" in sql_l:
                (tid,) = params[:1]
                tid = int(tid)
                self._last = store["templates"].get(tid)
                return

            self._last = None

        def fetchone(self):
            return self._last

        def fetchall(self):
            return list(store["templates"].values())

    @contextlib.contextmanager
    def fake_get_db_cursor(*args, **kwargs):
        cur = FakeCursor()
        yield cur

    monkeypatch.setattr(contract_routes, "get_db_cursor", fake_get_db_cursor)

