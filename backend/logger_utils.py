"""Thin wrapper around the JSON logger configured in middleware/logging.py.

Existing production code reaches for `print()` during startup, pool init and
exception handling because the legacy formatter used to make logger output
hard to read. The JSON handler installed by `middleware.logging` already
produces a structured stream-and-file log, so everything that used to print
can move to this module without losing the ergonomics.

Usage:

    from logger_utils import get_logger, log_event

    log = get_logger(__name__)
    log.info("pool initialised", extra={"min": _lo, "max": _hi})

    # One-shot structured event (drops to a pre-named logger):
    log_event("startup.env_ok", level="info", missing=[])
"""

from __future__ import annotations

import logging
import os
from typing import Any, Mapping, Optional

# Ensure the JSON handler from middleware.logging is attached even if a caller
# imports us before the FastAPI app boots. We guard with a flag so repeated
# imports don't stack handlers.
_CONFIGURED = False


def _configure_once() -> None:
    global _CONFIGURED
    if _CONFIGURED:
        return
    try:
        import middleware.logging  # noqa: F401 — side effect: installs handlers
    except Exception:
        # Fallback: minimal stream handler so callers still get output.
        root = logging.getLogger()
        if not root.handlers:
            logging.basicConfig(
                level=os.getenv("LOG_LEVEL", "INFO").upper(),
                format="%(asctime)s %(levelname)s %(name)s %(message)s",
            )
    _CONFIGURED = True


def get_logger(name: str = "miron") -> logging.Logger:
    _configure_once()
    return logging.getLogger(name)


_LEVELS = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warning": logging.WARNING,
    "warn": logging.WARNING,
    "error": logging.ERROR,
    "critical": logging.CRITICAL,
}


def log_event(
    event: str,
    *,
    level: str = "info",
    logger_name: str = "miron.event",
    **fields: Any,
) -> None:
    """Emit a structured, one-line event with arbitrary kwargs as extra fields.

    We keep this separate from `get_logger().info(...)` so callers don't need
    to remember to pass `extra={...}` or worry about clobbering reserved
    LogRecord attributes — the helper sanitises them first.
    """
    logger = get_logger(logger_name)
    safe = _sanitise_extra(fields)
    logger.log(_LEVELS.get(level.lower(), logging.INFO), event, extra=safe)


# LogRecord has a handful of reserved attribute names; passing them via extra
# raises KeyError at format time. We rename any clash rather than drop data.
_RESERVED = {
    "name", "msg", "args", "levelname", "levelno", "pathname", "filename",
    "module", "exc_info", "exc_text", "stack_info", "lineno", "funcName",
    "created", "msecs", "relativeCreated", "thread", "threadName",
    "processName", "process", "message", "asctime",
}


def _sanitise_extra(fields: Mapping[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in fields.items():
        out[f"field_{key}" if key in _RESERVED else key] = value
    return out


def log_exception(
    message: str,
    exc: BaseException,
    *,
    logger_name: str = "miron.error",
    **fields: Any,
) -> None:
    """Log an exception with traceback and structured context."""
    logger = get_logger(logger_name)
    logger.error(message, exc_info=exc, extra=_sanitise_extra(fields))


def mask_secret(value: Optional[str], *, show: int = 4) -> str:
    """Mask a secret for logs: 'abcd1234efgh' -> 'abcd****efgh'."""
    if not value:
        return "(unset)"
    if len(value) <= show * 2:
        return "*" * len(value)
    return f"{value[:show]}{'*' * 4}{value[-show:]}"
