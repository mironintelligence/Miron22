import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock

import routes.billing_routes as billing_routes


@pytest.fixture
def app():
    app = FastAPI()
    app.include_router(billing_routes.router)
    return app


@pytest.fixture
def client(app):
    return TestClient(app, base_url="https://testserver")


def test_upgrade_success(client, app, monkeypatch):
    app.dependency_overrides[billing_routes.get_current_user] = lambda: {"id": "00000000-0000-0000-0000-000000000001"}
    execute = AsyncMock(return_value=None)
    monkeypatch.setattr(billing_routes.db, "execute", execute)

    res = client.post(
        "/api/billing/upgrade",
        json={"plan_id": "pro", "payment_method_id": "pm_test"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "success"
    assert body["plan"] == "pro"
    execute.assert_awaited()


def test_upgrade_invalid_plan(client, app, monkeypatch):
    app.dependency_overrides[billing_routes.get_current_user] = lambda: {"id": "00000000-0000-0000-0000-000000000001"}
    execute = AsyncMock(return_value=None)
    monkeypatch.setattr(billing_routes.db, "execute", execute)

    res = client.post(
        "/api/billing/upgrade",
        json={"plan_id": "bad", "payment_method_id": "pm_test"},
    )
    assert res.status_code == 400
    assert execute.await_count == 0
