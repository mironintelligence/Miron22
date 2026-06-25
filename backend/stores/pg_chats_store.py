from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

from cryptography.fernet import Fernet, InvalidToken

from db import get_db_cursor


# ---------------------------------------------------------------------------
# Fernet symmetric encryption — key from CHAT_ENCRYPTION_KEY env var.
# If the key is absent, messages are stored plaintext in the JSONB column
# (legacy behaviour). Always prefer encrypted storage when key is present.
# ---------------------------------------------------------------------------

def _fernet() -> Optional[Fernet]:
    key = (os.environ.get("CHAT_ENCRYPTION_KEY") or "").strip()
    if not key:
        return None
    try:
        return Fernet(key.encode())
    except Exception:
        return None


def _encrypt(f: Fernet, data: str) -> str:
    return f.encrypt(data.encode("utf-8")).decode("ascii")


def _decrypt(f: Fernet, token: str) -> Optional[str]:
    try:
        return f.decrypt(token.encode("ascii")).decode("utf-8")
    except (InvalidToken, Exception):
        return None


def _msgs_from_row(row: Dict[str, Any]) -> List[Any]:
    f = _fernet()
    enc = row.get("messages_enc") or ""
    if enc and f:
        raw = _decrypt(f, enc)
        if raw:
            try:
                return json.loads(raw)
            except Exception:
                pass
    # Fall back to legacy unencrypted JSONB column
    msgs = row.get("messages")
    if isinstance(msgs, str):
        try:
            return json.loads(msgs)
        except Exception:
            return []
    return list(msgs) if msgs else []


def _ensure_table() -> None:
    with get_db_cursor(write=True) as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS assistant_chats (
                id           BIGINT PRIMARY KEY,
                user_id      UUID NOT NULL,
                name         TEXT NOT NULL DEFAULT 'Yeni sohbet',
                messages     JSONB NOT NULL DEFAULT '[]',
                messages_enc TEXT,
                expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        for stmt in [
            "ALTER TABLE assistant_chats ADD COLUMN IF NOT EXISTS messages_enc TEXT;",
            "ALTER TABLE assistant_chats ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days');",
            "CREATE INDEX IF NOT EXISTS idx_assistant_chats_user_updated ON assistant_chats(user_id, updated_at DESC);",
            "CREATE INDEX IF NOT EXISTS idx_assistant_chats_expires ON assistant_chats(expires_at);",
        ]:
            try:
                cur.execute(stmt)
            except Exception:
                pass
        # Purge expired rows
        cur.execute("DELETE FROM assistant_chats WHERE expires_at < NOW()")


try:
    _ensure_table()
except Exception:
    pass


def list_chats(user_id: str) -> List[Dict[str, Any]]:
    with get_db_cursor(write=False) as cur:
        cur.execute(
            "SELECT id, name, messages, messages_enc, created_at, updated_at "
            "FROM assistant_chats "
            "WHERE user_id = %s AND expires_at > NOW() "
            "ORDER BY updated_at DESC LIMIT 200",
            (user_id,),
        )
        rows = cur.fetchall() or []
    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "name": r["name"],
            "messages": _msgs_from_row(r),
            "createdAt": int(r["created_at"].timestamp() * 1000) if r.get("created_at") else r["id"],
            "date": r["updated_at"].strftime("%d.%m.%Y") if r.get("updated_at") else "",
        })
    return result


def get_chat(user_id: str, chat_id: int) -> Optional[Dict[str, Any]]:
    with get_db_cursor(write=False) as cur:
        cur.execute(
            "SELECT id, name, messages, messages_enc, created_at, updated_at "
            "FROM assistant_chats "
            "WHERE user_id = %s AND id = %s AND expires_at > NOW()",
            (user_id, chat_id),
        )
        r = cur.fetchone()
    if not r:
        return None
    return {
        "id": r["id"],
        "name": r["name"],
        "messages": _msgs_from_row(r),
        "createdAt": int(r["created_at"].timestamp() * 1000) if r.get("created_at") else r["id"],
        "date": r["updated_at"].strftime("%d.%m.%Y") if r.get("updated_at") else "",
    }


def upsert_chat(user_id: str, chat_id: int, name: str, messages: list) -> None:
    raw = json.dumps(messages, ensure_ascii=False)
    f = _fernet()
    enc = _encrypt(f, raw) if f else None
    # If encrypted, clear plaintext column; otherwise keep plaintext for readability
    msgs_jsonb = "[]" if enc else raw

    with get_db_cursor(write=True) as cur:
        cur.execute("""
            INSERT INTO assistant_chats
                (id, user_id, name, messages, messages_enc, expires_at, updated_at)
            VALUES
                (%s, %s, %s, %s::jsonb, %s, NOW() + INTERVAL '90 days', NOW())
            ON CONFLICT (id) DO UPDATE
              SET name         = EXCLUDED.name,
                  messages     = EXCLUDED.messages,
                  messages_enc = EXCLUDED.messages_enc,
                  expires_at   = NOW() + INTERVAL '90 days',
                  updated_at   = NOW()
            WHERE assistant_chats.user_id = %s
        """, (chat_id, user_id, name, msgs_jsonb, enc, user_id))


def rename_chat(user_id: str, chat_id: int, name: str) -> bool:
    with get_db_cursor(write=True) as cur:
        cur.execute(
            "UPDATE assistant_chats SET name = %s, updated_at = NOW() "
            "WHERE user_id = %s AND id = %s AND expires_at > NOW()",
            (name, user_id, chat_id),
        )
        return cur.rowcount > 0


def delete_chat(user_id: str, chat_id: int) -> bool:
    with get_db_cursor(write=True) as cur:
        cur.execute(
            "DELETE FROM assistant_chats WHERE user_id = %s AND id = %s",
            (user_id, chat_id),
        )
        return cur.rowcount > 0
