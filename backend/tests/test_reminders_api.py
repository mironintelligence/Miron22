from contextlib import contextmanager
from unittest.mock import MagicMock

from fastapi import FastAPI
from fastapi.testclient import TestClient

import routes.reminder_routes as reminder_routes


@contextmanager
def _fake_db_cursor():
    cur = MagicMock()
    cur.fetchall.return_value = []
    cur.fetchone.return_value = {"id": "r1"}
    yield cur


def test_reminder_crud(monkeypatch):
    app = FastAPI()
    app.include_router(reminder_routes.router)
    app.dependency_overrides[reminder_routes.get_current_user] = lambda: {"id": "u1"}
    monkeypatch.setattr(reminder_routes, "get_db_cursor", _fake_db_cursor)

    c = TestClient(app, base_url="https://testserver")
    res = c.post("/api/reminders", json={"title": "Duruşma", "details": "Not", "due_at": "2030-01-01T10:00:00Z"})
    assert res.status_code == 200

    res = c.get("/api/reminders")
    assert res.status_code == 200
    assert res.json() == []

    res = c.delete("/api/reminders/r1")
    assert res.status_code == 200

