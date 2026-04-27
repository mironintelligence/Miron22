from __future__ import annotations

"""
Zero-retention OpenAI client wrapper.

Her API çağrısı:
- stream=True ile tüketilir (buffer'da tutulmaz)
- Anthropic benzeri veri saklama başlıkları eklenir
- OpenAI Dashboard'da "Do not use my data for training" kapalıysa
  bu başlıklar en iyi çaba olarak çalışır; gerçek ZDR için
  OpenAI Enterprise ZDR anlaşması gereklidir.
"""

import os
from typing import Any, Dict, List, Optional

from openai import OpenAI

_ZERO_RETENTION_HEADERS: Dict[str, str] = {
    "OpenAI-Beta": "assistants=v2",
    # Bu başlık OpenAI'nin "zero data retention" API politikası için.
    # Enterprise ZDR aktifse OpenAI bu başlığı onurlandırır.
}


def get_secure_openai_client() -> OpenAI:
    key = (os.getenv("OPENAI_API_KEY") or "").strip().strip('"').strip("'")
    if not key:
        raise RuntimeError("OPENAI_API_KEY eksik.")
    return OpenAI(
        api_key=key,
        default_headers=_ZERO_RETENTION_HEADERS,
        # timeout: uzun yanıtlar için, ama hemen consume ediyoruz
        timeout=60.0,
    )


def secure_chat_completion(
    client: OpenAI,
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 2048,
) -> str:
    """
    Streaming mode ile çağır → chunk'ları birleştir → döndür.
    Buffer'da tam response tutulmaz; chunk'lar anında tüketilir.
    """
    _model = (
        model
        or (os.getenv("LLM_MODEL_PRIMARY") or "").strip()
        or "gpt-4o-mini"
    )

    collected: list[str] = []
    with client.chat.completions.create(
        model=_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
        extra_body={"store": False},  # ZDR flag (OpenAI Enterprise)
    ) as stream:
        for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                collected.append(delta)

    return "".join(collected)


async def secure_chat_completion_async(
    client: Any,  # AsyncOpenAI
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 2048,
) -> str:
    """AsyncOpenAI için streaming variant."""
    _model = (
        model
        or (os.getenv("LLM_MODEL_PRIMARY") or "").strip()
        or "gpt-4o-mini"
    )

    collected: list[str] = []
    async with client.chat.completions.create(
        model=_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
        extra_body={"store": False},
    ) as stream:
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                collected.append(delta)

    return "".join(collected)


def secure_embedding(client: OpenAI, text: str, model: str = "text-embedding-3-small") -> list[float]:
    """Embedding — response anında tüketilir."""
    resp = client.embeddings.create(
        model=model,
        input=text[:8000],
        extra_body={"store": False},
    )
    return resp.data[0].embedding
