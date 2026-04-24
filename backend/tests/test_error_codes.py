"""Tests for the unified error envelope introduced in error_codes.py."""

from __future__ import annotations

import sys
import pathlib

import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

# Make the sibling backend package importable when pytest is run from repo root.
BACKEND = pathlib.Path(__file__).resolve().parent.parent
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from error_codes import (  # noqa: E402
    AppError,
    ErrorCode,
    build_envelope,
    code_for_status,
)


def test_code_for_status_default():
    assert code_for_status(400) is ErrorCode.VALIDATION_ERROR
    assert code_for_status(401) is ErrorCode.AUTH_REQUIRED
    assert code_for_status(404) is ErrorCode.NOT_FOUND
    assert code_for_status(429) is ErrorCode.RATE_LIMITED
    assert code_for_status(502) is ErrorCode.UPSTREAM_ERROR


def test_code_for_unknown_status_falls_back_to_internal():
    assert code_for_status(418) is ErrorCode.INTERNAL_ERROR
    assert code_for_status(999) is ErrorCode.INTERNAL_ERROR


def test_build_envelope_includes_optional_fields():
    body = build_envelope(
        code=ErrorCode.VALIDATION_ERROR,
        detail="bad",
        request_id="req-1",
        context={"field": "email"},
    )
    assert body == {
        "code": "VALIDATION_ERROR",
        "detail": "bad",
        "request_id": "req-1",
        "context": {"field": "email"},
    }


def test_build_envelope_omits_optional_when_none():
    body = build_envelope(code=ErrorCode.NOT_FOUND, detail="x")
    assert body == {"code": "NOT_FOUND", "detail": "x"}


def test_app_error_carries_code_and_context():
    err = AppError(
        code=ErrorCode.AUTH_MFA_REQUIRED,
        message="MFA required",
        status_code=401,
        context={"next": "/mfa"},
    )
    assert err.code is ErrorCode.AUTH_MFA_REQUIRED
    assert err.context == {"next": "/mfa"}
    assert err.status_code == 401


def _mk_app():
    app = FastAPI()

    @app.exception_handler(AppError)
    async def _h(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content=build_envelope(
                code=exc.code,
                detail=str(exc.detail),
                context=exc.context or None,
            ),
        )

    @app.exception_handler(HTTPException)
    async def _h2(request: Request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=build_envelope(code=code_for_status(exc.status_code), detail=str(exc.detail)),
        )

    @app.get("/app-error")
    def _a():
        raise AppError(code=ErrorCode.QUOTA_EXCEEDED, message="too much", status_code=429)

    @app.get("/http-error")
    def _b():
        raise HTTPException(status_code=404, detail="nope")

    return app


def test_app_error_produces_envelope():
    client = TestClient(_mk_app())
    r = client.get("/app-error")
    assert r.status_code == 429
    assert r.json() == {"code": "QUOTA_EXCEEDED", "detail": "too much"}


def test_http_exception_produces_envelope():
    client = TestClient(_mk_app())
    r = client.get("/http-error")
    assert r.status_code == 404
    assert r.json() == {"code": "NOT_FOUND", "detail": "nope"}


@pytest.mark.parametrize(
    "code",
    [c for c in ErrorCode],
)
def test_all_codes_are_serialisable(code):
    body = build_envelope(code=code, detail="x")
    assert body["code"] == code.value
