from __future__ import annotations
import json
from typing import Any, Dict, List, Optional
from db import get_db_cursor

def _ensure_table():
    with get_db_cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS assistant_chats (
                id         BIGINT PRIMARY KEY,
                user_id    UUID NOT NULL,
                name       TEXT NOT NULL DEFAULT 'Yeni sohbet',
                messages   JSONB NOT NULL DEFAULT '[]',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_assistant_chats_user_updated
            ON assistant_chats(user_id, updated_at DESC)
        """)

try:
    _ensure_table()
except Exception:
    pass


def list_chats(user_id: str) -> List[Dict[str, Any]]:
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT id, name, messages, created_at, updated_at "
            "FROM assistant_chats WHERE user_id = %s ORDER BY updated_at DESC LIMIT 200",
            (user_id,),
        )
        rows = cur.fetchall() or []
    result = []
    for r in rows:
        msgs = r.get("messages")
        if isinstance(msgs, str):
            try:
                msgs = json.loads(msgs)
            except Exception:
                msgs = []
        result.append({
            "id": r["id"],
            "name": r["name"],
            "messages": msgs or [],
            "createdAt": int(r["created_at"].timestamp() * 1000) if r.get("created_at") else r["id"],
            "date": r["updated_at"].strftime("%d.%m.%Y") if r.get("updated_at") else "",
        })
    return result


def get_chat(user_id: str, chat_id: int) -> Optional[Dict[str, Any]]:
    with get_db_cursor() as cur:
        cur.execute(
            "SELECT id, name, messages, created_at, updated_at "
            "FROM assistant_chats WHERE user_id = %s AND id = %s",
            (user_id, chat_id),
        )
        r = cur.fetchone()
    if not r:
        return None
    msgs = r.get("messages")
    if isinstance(msgs, str):
        try:
            msgs = json.loads(msgs)
        except Exception:
            msgs = []
    return {
        "id": r["id"],
        "name": r["name"],
        "messages": msgs or [],
        "createdAt": int(r["created_at"].timestamp() * 1000) if r.get("created_at") else r["id"],
        "date": r["updated_at"].strftime("%d.%m.%Y") if r.get("updated_at") else "",
    }


def upsert_chat(user_id: str, chat_id: int, name: str, messages: list) -> None:
    msgs_json = json.dumps(messages, ensure_ascii=False)
    with get_db_cursor() as cur:
        cur.execute("""
            INSERT INTO assistant_chats (id, user_id, name, messages, updated_at)
            VALUES (%s, %s, %s, %s::jsonb, NOW())
            ON CONFLICT (id) DO UPDATE
              SET name = EXCLUDED.name,
                  messages = EXCLUDED.messages,
                  updated_at = NOW()
            WHERE assistant_chats.user_id = %s
        """, (chat_id, user_id, name, msgs_json, user_id))


def rename_chat(user_id: str, chat_id: int, name: str) -> bool:
    with get_db_cursor() as cur:
        cur.execute(
            "UPDATE assistant_chats SET name = %s, updated_at = NOW() "
            "WHERE user_id = %s AND id = %s",
            (name, user_id, chat_id),
        )
        return cur.rowcount > 0


def delete_chat(user_id: str, chat_id: int) -> bool:
    with get_db_cursor() as cur:
        cur.execute(
            "DELETE FROM assistant_chats WHERE user_id = %s AND id = %s",
            (user_id, chat_id),
        )
        return cur.rowcount > 0
