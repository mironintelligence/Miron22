"""
MironLaw 1.0 — HuggingFace Inference Client
openai_client.py'ın drop-in replacement'ı.

Mevcut backend'de sadece MIRONLAW_MODE=1 env var'ı set et,
başka hiçbir şeyi değiştirmene gerek yok.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional


HF_MODEL_REPO = os.getenv("MIRONLAW_MODEL", "mironintelligence/MironLaw-1.0")
HF_TOKEN = os.getenv("HF_TOKEN", "")


class _MironLawMessage:
    def __init__(self, content: str):
        self.content = content


class _MironLawChoice:
    def __init__(self, content: str):
        self.message = _MironLawMessage(content)


class _MironLawCompletion:
    def __init__(self, content: str):
        self.choices = [_MironLawChoice(content)]


class MironLawClient:
    """
    HuggingFace Inference API üzerinden MironLaw 1.0'ı çağırır.
    OpenAI client ile aynı interface'i sunar.
    """

    def __init__(self, model_repo: str = HF_MODEL_REPO, token: str = HF_TOKEN):
        self.model_repo = model_repo
        self.token = token
        self._client = self._init_client()

    def _init_client(self):
        try:
            from huggingface_hub import InferenceClient
            return InferenceClient(model=self.model_repo, token=self.token or None)
        except ImportError:
            raise RuntimeError("huggingface_hub kurulu değil: pip install huggingface_hub")

    @property
    def chat(self):
        return self

    @property
    def completions(self):
        return self

    def create(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1024,
        **kwargs,
    ) -> _MironLawCompletion:
        """OpenAI client.chat.completions.create() ile aynı interface."""
        try:
            result = self._client.chat_completion(
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            content = result.choices[0].message.content or ""
            return _MironLawCompletion(content)
        except Exception as e:
            raise RuntimeError(f"MironLaw inference hata: {e}") from e


def get_mironlaw_client() -> MironLawClient:
    return MironLawClient()


def is_mironlaw_mode() -> bool:
    return os.getenv("MIRONLAW_MODE", "").lower() in ("1", "true", "yes")
