from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None

from openai import OpenAI

_GROQ_BASE_URL = "https://api.groq.com/openai/v1"


def _load_env() -> None:
    if load_dotenv is None:
        return
    env_path = Path(__file__).resolve().parent / ".env"
    load_dotenv(dotenv_path=env_path, override=False)


def _clean_key(k: str) -> str:
    return (k or "").strip().strip('"').strip("'")


def get_groq_api_key() -> str:
    _load_env()
    return _clean_key(os.getenv("GROQ_API_KEY", ""))


def get_openai_api_key() -> str:
    _load_env()
    return _clean_key(os.getenv("OPENAI_API_KEY", ""))


def is_groq_active() -> bool:
    """Groq key varsa True — chat completions için Groq kullanılır."""
    return bool(get_groq_api_key())


def get_openai_client() -> OpenAI:
    """
    Chat completions için client döndürür.
    GROQ_API_KEY varsa Groq'a, yoksa OpenAI'a bağlanır.
    """
    groq_key = get_groq_api_key()
    if groq_key:
        return OpenAI(api_key=groq_key, base_url=_GROQ_BASE_URL)
    openai_key = get_openai_api_key()
    if not openai_key:
        raise RuntimeError(
            "Ne GROQ_API_KEY ne de OPENAI_API_KEY bulundu. "
            "Render env vars içine GROQ_API_KEY veya OPENAI_API_KEY ekle."
        )
    return OpenAI(api_key=openai_key)


def get_embedding_client() -> Optional[OpenAI]:
    """
    Embedding için her zaman OpenAI kullanılır (Groq embedding desteklemiyor).
    OPENAI_API_KEY yoksa None döner — embedding sessizce atlanır.
    """
    key = get_openai_api_key()
    if not key:
        return None
    return OpenAI(api_key=key)


def key_tail() -> str:
    try:
        if is_groq_active():
            k = get_groq_api_key()
            return f"groq:{k[-6:]}"
        k = get_openai_api_key()
        return k[-6:] if k else "NONE"
    except Exception:
        return "NONE"


def key_debug() -> str:
    try:
        if is_groq_active():
            k = get_groq_api_key()
            return f"GROQ_API_KEY: present len={len(k)} tail={k[-6:]}"
        k = get_openai_api_key()
        if not k:
            return "OPENAI_API_KEY: MISSING"
        return f"OPENAI_API_KEY: present len={len(k)} prefix={k[:7]} tail={k[-6:]}"
    except Exception:
        return "API_KEY: ERROR"
