"""
Merkezi LLM çağrıları: env'den model, primary -> fallback.
GROQ_API_KEY varsa Groq modelleri, yoksa OpenAI modelleri kullanılır.
"""
from __future__ import annotations

import os
import re
from typing import Any, Optional

try:
    from openai import APIConnectionError, APITimeoutError, RateLimitError
except Exception:  # pragma: no cover
    RateLimitError = APIConnectionError = APITimeoutError = Exception  # type: ignore


def _groq_active() -> bool:
    from openai_client import is_groq_active
    return is_groq_active()


def _ollama_active() -> bool:
    from openai_client import is_ollama_active
    return is_ollama_active()


def llm_primary_model() -> str:
    explicit = (os.getenv("LLM_MODEL_PRIMARY") or "").strip()
    if explicit:
        return explicit
    if _ollama_active():
        return (os.getenv("OLLAMA_MODEL") or "qwen2.5:1.5b-instruct").strip()
    return "llama-3.3-70b-versatile" if _groq_active() else "gpt-4o-mini"


def llm_fallback_model() -> str:
    explicit = (os.getenv("LLM_MODEL_FALLBACK") or "").strip()
    if explicit:
        return explicit
    if _ollama_active():
        return llm_primary_model()
    return "llama-3.1-8b-instant" if _groq_active() else "gpt-4o"


def _model_chain(explicit: Optional[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    first = (explicit or "").strip() or llm_primary_model()
    # GPT model adı gelirse Groq aktifken eşdeğer modele dönüştür
    if _groq_active():
        first = _map_to_groq(first)
    for m in (first, llm_fallback_model()):
        if m and m not in seen:
            seen.add(m)
            out.append(m)
    return out


def _map_to_groq(model: str) -> str:
    """OpenAI model adını Groq eşdeğerine çevirir."""
    mapping = {
        "gpt-4o": "llama-3.3-70b-versatile",
        "gpt-4o-mini": "llama-3.3-70b-versatile",
        "gpt-4-turbo": "llama-3.3-70b-versatile",
        "gpt-4": "llama-3.3-70b-versatile",
        "gpt-3.5-turbo": "llama-3.1-8b-instant",
    }
    return mapping.get(model, model)


_THINK_RE = re.compile(r"<think>[\s\S]*?</think>", re.IGNORECASE)


def _strip_think(text: str) -> str:
    """DeepSeek R1 <think>...</think> bloklarını temizler."""
    return _THINK_RE.sub("", text or "").strip()


def chat_completions_create(client: Any, **kwargs: Any):
    """
    OpenAI/Groq senkron client.chat.completions.create.
    RateLimitError / APIConnectionError / APITimeoutError sonrası fallback.
    """
    kwargs = dict(kwargs)
    model = kwargs.pop("model", None)
    last_err: Optional[BaseException] = None
    for m in _model_chain(model):
        try:
            resp = client.chat.completions.create(model=m, **kwargs)
            if resp.choices and resp.choices[0].message.content:
                resp.choices[0].message.content = _strip_think(
                    resp.choices[0].message.content
                )
            return resp
        except (RateLimitError, APIConnectionError, APITimeoutError) as e:
            last_err = e
            continue
    if last_err:
        raise last_err
    raise RuntimeError("LLM çağrısı başarısız (model zinciri boş).")


async def chat_completions_create_async(client: Any, **kwargs: Any):
    """AsyncOpenAI/Groq için aynı mantık."""
    kwargs = dict(kwargs)
    model = kwargs.pop("model", None)
    last_err: Optional[BaseException] = None
    for m in _model_chain(model):
        try:
            resp = await client.chat.completions.create(model=m, **kwargs)
            if resp.choices and resp.choices[0].message.content:
                resp.choices[0].message.content = _strip_think(
                    resp.choices[0].message.content
                )
            return resp
        except (RateLimitError, APIConnectionError, APITimeoutError) as e:
            last_err = e
            continue
    if last_err:
        raise last_err
    raise RuntimeError("LLM çağrısı başarısız (model zinciri boş).")
