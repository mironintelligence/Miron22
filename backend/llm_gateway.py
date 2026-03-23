"""
Merkezi LLM çağrıları: env'den model, primary -> fallback (rate limit / bağlantı).
Geçersiz model adları kullanılmaz; varsayılan gpt-4o-mini -> gpt-4o.
"""
from __future__ import annotations

import os
from typing import Any, Optional

try:
    from openai import APIConnectionError, APITimeoutError, RateLimitError
except Exception:  # pragma: no cover
    RateLimitError = APIConnectionError = APITimeoutError = Exception  # type: ignore


def llm_primary_model() -> str:
    return (os.getenv("LLM_MODEL_PRIMARY") or "gpt-4o-mini").strip()


def llm_fallback_model() -> str:
    return (os.getenv("LLM_MODEL_FALLBACK") or "gpt-4o").strip()


def _model_chain(explicit: Optional[str]) -> list[str]:
    """İlk denenen model + yedek; tekrar yok."""
    seen: set[str] = set()
    out: list[str] = []
    first = (explicit or "").strip() or llm_primary_model()
    for m in (first, llm_fallback_model()):
        if m and m not in seen:
            seen.add(m)
            out.append(m)
    return out


def chat_completions_create(client: Any, **kwargs: Any):
    """
    OpenAI senkron client.chat.completions.create ile aynı imza (model= dahil).
    RateLimitError / APIConnectionError / APITimeoutError sonrası fallback modele geçer.
    """
    kwargs = dict(kwargs)
    model = kwargs.pop("model", None)
    last_err: Optional[BaseException] = None
    for m in _model_chain(model):
        try:
            return client.chat.completions.create(model=m, **kwargs)
        except (RateLimitError, APIConnectionError, APITimeoutError) as e:
            last_err = e
            continue
    if last_err:
        raise last_err
    raise RuntimeError("LLM çağrısı başarısız (model zinciri boş).")


async def chat_completions_create_async(client: Any, **kwargs: Any):
    """AsyncOpenAI için aynı mantık."""
    kwargs = dict(kwargs)
    model = kwargs.pop("model", None)
    last_err: Optional[BaseException] = None
    for m in _model_chain(model):
        try:
            return await client.chat.completions.create(model=m, **kwargs)
        except (RateLimitError, APIConnectionError, APITimeoutError) as e:
            last_err = e
            continue
    if last_err:
        raise last_err
    raise RuntimeError("LLM çağrısı başarısız (model zinciri boş).")
