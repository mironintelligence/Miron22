from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

from openai import OpenAI


def _load_env() -> None:
    """
    .env'yi kesin olarak backend klasöründen yükler.
    Uvicorn farklı dizinden çalışsa bile sağlamdır.
    """
    if load_dotenv is None:
        return
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(dotenv_path=env_path, override=True)


def _clean_key(k: str) -> str:
    return (k or "").strip().strip('"').strip("'")


def get_openai_api_key() -> str:
    _load_env()
    key = _clean_key(os.getenv("OPENAI_API_KEY", ""))
    if not key:
        raise RuntimeError(
            "OPENAI_API_KEY bulunamadı. backend/.env içine şu formatta ekle:\n"
            "OPENAI_API_KEY=sk-... veya sk-proj-..."
        )
    return key


def get_openai_client() -> OpenAI:
    key = get_openai_api_key()
    return OpenAI(api_key=key)


def key_tail() -> str:
    """
    Sadece tail döndürür (log için güvenli).
    """
    try:
        k = get_openai_api_key()
    except Exception:
        return "NONE"
    return k[-6:]


def key_debug() -> str:
    """
    Log için güvenli debug.
    """
    try:
        k = get_openai_api_key()
    except Exception:
        return "OPENAI_API_KEY: MISSING"
    return f"OPENAI_API_KEY: present len={len(k)} prefix={k[:7]} tail={k[-6:]}"