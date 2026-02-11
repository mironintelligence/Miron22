from __future__ import annotations
from typing import Any, Dict, List

def read_users() -> List[Dict[str, Any]]:
    return []

def write_users(users: List[Dict[str, Any]]) -> None:
    raise RuntimeError("users_store JSON storage kaldırıldı; Supabase Auth kullanılmalı.")
