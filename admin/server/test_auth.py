"""Regression tests for the legacy admin auth guard."""

from __future__ import annotations

import os
import secrets

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

import auth


@pytest.fixture(autouse=True)
def _reset_env(monkeypatch):
    monkeypatch.delenv("ADMIN_API_TOKEN", raising=False)
    monkeypatch.delenv("ADMIN_ALLOWED_ORIGINS", raising=False)
    yield


def _build_app(token: str, origins: str) -> FastAPI:
    os.environ["ADMIN_API_TOKEN"] = token
    os.environ["ADMIN_ALLOWED_ORIGINS"] = origins
    app = auth.configure_admin_app(FastAPI())

    @app.get("/secret", dependencies=[Depends(auth.require_token)])
    def _secret():
        return {"ok": True}

    @app.get("/public")
    def _public():
        return {"ok": True}

    return app


def test_configure_fails_without_token(monkeypatch):
    monkeypatch.setenv("ADMIN_ALLOWED_ORIGINS", "https://admin.example.com")
    with pytest.raises(RuntimeError, match="ADMIN_API_TOKEN"):
        auth.configure_admin_app(FastAPI())


def test_configure_rejects_wildcard_origin(monkeypatch):
    monkeypatch.setenv("ADMIN_API_TOKEN", secrets.token_urlsafe(48))
    monkeypatch.setenv("ADMIN_ALLOWED_ORIGINS", "*")
    with pytest.raises(RuntimeError, match="cannot contain"):
        auth.configure_admin_app(FastAPI())


def test_configure_rejects_short_token(monkeypatch):
    monkeypatch.setenv("ADMIN_API_TOKEN", "short")
    monkeypatch.setenv("ADMIN_ALLOWED_ORIGINS", "https://admin.example.com")
    with pytest.raises(RuntimeError, match="too short"):
        auth.configure_admin_app(FastAPI())


def test_missing_authorization_header_is_401():
    token = secrets.token_urlsafe(48)
    client = TestClient(_build_app(token, "https://admin.example.com"))
    resp = client.get("/secret")
    assert resp.status_code == 401
    assert "WWW-Authenticate" in resp.headers


def test_wrong_token_is_401():
    token = secrets.token_urlsafe(48)
    client = TestClient(_build_app(token, "https://admin.example.com"))
    resp = client.get("/secret", headers={"Authorization": "Bearer wrong"})
    assert resp.status_code == 401


def test_valid_token_passes():
    token = secrets.token_urlsafe(48)
    client = TestClient(_build_app(token, "https://admin.example.com"))
    resp = client.get("/secret", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == {"ok": True}


def test_public_route_still_unauthed():
    token = secrets.token_urlsafe(48)
    client = TestClient(_build_app(token, "https://admin.example.com"))
    assert client.get("/public").status_code == 200
