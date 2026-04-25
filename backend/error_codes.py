"""Stable machine-readable error codes for API consumers.

The frontend and mobile clients should branch on `code`, never on the
translated `detail` string. New codes may be added at any time; existing
codes must not be renamed or re-purposed without a coordinated client
release.

Usage:

    from error_codes import AppError, ErrorCode

    raise AppError(
        code=ErrorCode.AUTH_INVALID_CREDENTIALS,
        message="E-posta veya şifre hatalı.",
        status_code=401,
    )

The global exception handler wired up in main.py translates both AppError
and plain HTTPException into the unified envelope:

    {
        "code": "AUTH_INVALID_CREDENTIALS",
        "detail": "E-posta veya şifre hatalı.",
        "request_id": "...",
    }
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, Optional

from fastapi import HTTPException


class ErrorCode(str, Enum):
    # --- Generic ---
    INTERNAL_ERROR = "INTERNAL_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    CONFLICT = "CONFLICT"
    RATE_LIMITED = "RATE_LIMITED"
    TIMEOUT = "TIMEOUT"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"

    # --- Auth ---
    AUTH_REQUIRED = "AUTH_REQUIRED"
    AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS"
    AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED"
    AUTH_TOKEN_REVOKED = "AUTH_TOKEN_REVOKED"
    AUTH_ACCOUNT_LOCKED = "AUTH_ACCOUNT_LOCKED"
    AUTH_MFA_REQUIRED = "AUTH_MFA_REQUIRED"
    AUTH_MFA_INVALID = "AUTH_MFA_INVALID"
    AUTH_CSRF_INVALID = "AUTH_CSRF_INVALID"

    # --- Authorization ---
    FORBIDDEN = "FORBIDDEN"
    LEGAL_ACCEPTANCE_REQUIRED = "LEGAL_ACCEPTANCE_REQUIRED"
    SUBSCRIPTION_REQUIRED = "SUBSCRIPTION_REQUIRED"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"

    # --- Input / Payload ---
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"
    UNSUPPORTED_MEDIA = "UNSUPPORTED_MEDIA"
    INVALID_INPUT = "INVALID_INPUT"

    # --- Upstream ---
    UPSTREAM_ERROR = "UPSTREAM_ERROR"
    OPENAI_ERROR = "OPENAI_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


class AppError(HTTPException):
    """HTTPException carrying a stable `code` and optional context dict."""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        *,
        status_code: int = 400,
        context: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        self.code = code
        self.context = context or {}
        super().__init__(status_code=status_code, detail=message, headers=headers)


# Default HTTP-status → ErrorCode mapping for bare HTTPException raised
# from routes we do not yet own. Keeps the envelope stable without forcing
# every caller to import ErrorCode on day one.
_STATUS_TO_CODE: Dict[int, ErrorCode] = {
    400: ErrorCode.VALIDATION_ERROR,
    401: ErrorCode.AUTH_REQUIRED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    409: ErrorCode.CONFLICT,
    413: ErrorCode.PAYLOAD_TOO_LARGE,
    415: ErrorCode.UNSUPPORTED_MEDIA,
    422: ErrorCode.VALIDATION_ERROR,
    429: ErrorCode.RATE_LIMITED,
    500: ErrorCode.INTERNAL_ERROR,
    502: ErrorCode.UPSTREAM_ERROR,
    503: ErrorCode.SERVICE_UNAVAILABLE,
    504: ErrorCode.TIMEOUT,
}


def code_for_status(status_code: int) -> ErrorCode:
    return _STATUS_TO_CODE.get(int(status_code), ErrorCode.INTERNAL_ERROR)


def build_envelope(
    *,
    code: ErrorCode,
    detail: str,
    request_id: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    body: Dict[str, Any] = {"code": code.value, "detail": detail}
    if request_id:
        body["request_id"] = request_id
    if context:
        body["context"] = context
    return body
