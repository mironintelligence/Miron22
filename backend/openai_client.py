from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

from openai import OpenAI

# ── MironLaw 1.0 desteği ──
# MIRONLAW_MODE=1 env var'ı set edilirse kendi modelimizi kullanır,
# OpenAI API'ye hiç gitmez.
_MIRONLAW_MODE = os.getenv("MIRONLAW_MODE", "").lower() in ("1", "true", "yes")


def _load_env() -> None:
    """
    .env'yi kesin olarak backend klasöründen yükler.
    Uvicorn farklı dizinden çalışsa bile sağlamdır.
    """
    if load_dotenv is None:
        return
    env_path = Path(__file__).resolve().parent / ".env"
    # Preserve shell env (production platforms and pytest fixtures) — only
    # fill in missing values from the local .env file.
    load_dotenv(dotenv_path=env_path, override=False)


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


def get_openai_client():
    """
    MIRONLAW_MODE=1 ise MironLaw 1.0 client döner (ücretsiz, HF üzerinden).
    Aksi halde OpenAI client döner.
    """
    if _MIRONLAW_MODE:
        try:
            import sys, pathlib
            sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
            from mironlaw.serve.hf_client import get_mironlaw_client
            return get_mironlaw_client()
        except Exception as e:
            print(f"[WARN] MironLaw client yüklenemedi, OpenAI'a fallback: {e}")
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