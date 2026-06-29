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


def get_ollama_base_url() -> str:
    _load_env()
    base = _clean_key(os.getenv("OLLAMA_BASE_URL", ""))
    if not base:
        return ""
    return base.rstrip("/")


def is_ollama_active() -> bool:
    _load_env()
    provider = _clean_key(os.getenv("LLM_PROVIDER", "")).lower()
    return provider == "ollama" or bool(get_ollama_base_url())


def is_groq_active() -> bool:
    """Groq key varsa True — chat completions için Groq kullanılır."""
    return (not is_ollama_active()) and bool(get_groq_api_key())


def get_openai_client() -> OpenAI:
    """
    Chat completions için client döndürür.
    LLM_PROVIDER=ollama veya OLLAMA_BASE_URL varsa Ollama'ya,
    GROQ_API_KEY varsa Groq'a, yoksa OpenAI'a bağlanır.
    """
    ollama_base = get_ollama_base_url()
    if is_ollama_active():
        if not ollama_base:
            raise RuntimeError("LLM_PROVIDER=ollama ama OLLAMA_BASE_URL tanımlı değil.")
        return OpenAI(
            api_key=_clean_key(os.getenv("OLLAMA_API_KEY", "")) or "ollama",
            base_url=f"{ollama_base}/v1",
        )

    groq_key = get_groq_api_key()
    if groq_key:
        return OpenAI(api_key=groq_key, base_url=_GROQ_BASE_URL)
    openai_key = get_openai_api_key()
    if not openai_key:
        raise RuntimeError(
            "Ne OLLAMA_BASE_URL ne GROQ_API_KEY ne de OPENAI_API_KEY bulundu. "
            "Render/Lenovo env vars içine OLLAMA_BASE_URL, GROQ_API_KEY veya OPENAI_API_KEY ekle."
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
        if is_ollama_active():
            return f"ollama:{get_ollama_base_url() or 'missing'}"
        if is_groq_active():
            k = get_groq_api_key()
            return f"groq:{k[-6:]}"
        k = get_openai_api_key()
        return k[-6:] if k else "NONE"
    except Exception:
        return "NONE"


def key_debug() -> str:
    try:
        if is_ollama_active():
            return f"OLLAMA_BASE_URL: {get_ollama_base_url() or 'MISSING'}"
        if is_groq_active():
            k = get_groq_api_key()
            return f"GROQ_API_KEY: present len={len(k)} tail={k[-6:]}"
        k = get_openai_api_key()
        if not k:
            return "OPENAI_API_KEY: MISSING"
        return f"OPENAI_API_KEY: present len={len(k)} prefix={k[:7]} tail={k[-6:]}"
    except Exception:
        return "API_KEY: ERROR"
