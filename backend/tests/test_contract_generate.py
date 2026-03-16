import json
from contextlib import contextmanager
from unittest.mock import MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

import routes.contract_routes as contract_routes


@contextmanager
def _fake_db_cursor():
    cur = MagicMock()
    cur.fetchone.return_value = {"id": 123}
    yield cur


def test_contract_generate_ok(monkeypatch):
    app = FastAPI()
    app.include_router(contract_routes.router)
    app.dependency_overrides[contract_routes.get_current_user] = lambda: {"id": "u1"}

    mock_client = MagicMock()
    mock_completion = MagicMock()
    mock_completion.choices[0].message.content = "SÖZLEŞME METNİ"
    mock_client.chat.completions.create.return_value = mock_completion

    monkeypatch.setattr(contract_routes, "get_openai_client", lambda: mock_client)
    monkeypatch.setattr(contract_routes, "get_db_cursor", _fake_db_cursor)

    c = TestClient(app, base_url="https://testserver")
    res = c.post("/api/contracts/generate", json={"template_id": "1", "values": {"kiraci_ad_soyad": "A"}})
    assert res.status_code == 200
    body = res.json()
    assert body["generated"] == "SÖZLEŞME METNİ"


def test_contract_templates_remote_skipped_in_test_env(monkeypatch):
    app = FastAPI()
    app.include_router(contract_routes.router)
    app.dependency_overrides[contract_routes.get_current_user] = lambda: {"id": "u1"}

    monkeypatch.setenv("ENVIRONMENT", "test")
    c = TestClient(app, base_url="https://testserver")
    res = c.get("/api/contracts/templates?include_remote=true")
    assert res.status_code == 200
    items = res.json()
    assert isinstance(items, list)
