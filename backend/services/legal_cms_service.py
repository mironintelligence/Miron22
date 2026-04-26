"""Legal document storage, versioning, and user acceptance checks."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Sequence, Tuple

from db import get_db_cursor
from legal_cms_config import DISPLAY_TITLES, LEGAL_DOC_TYPES, required_acceptance_types
from stores.pg_users_store import _use_inmemory

logger = logging.getLogger("miron.legal_cms")

_SEED_DIR = __import__("pathlib").Path(__file__).resolve().parent.parent / "legal_seed_md"


def _read_seed_markdown(doc_type: str) -> str:
    path = _SEED_DIR / f"{doc_type}.md"
    if not path.is_file():
        raise FileNotFoundError(f"Missing seed file: {path}")
    return path.read_text(encoding="utf-8")


def seed_v1_if_empty() -> None:
    """Idempotent: insert active v1.0 rows for all known types when tables are empty per type."""
    if _use_inmemory():
        return
    meta: List[Tuple[str, str, str, bool]] = [
        ("terms", DISPLAY_TITLES["terms"], "terms", True),
        ("privacy", DISPLAY_TITLES["privacy"], "privacy", True),
        ("dpa", DISPLAY_TITLES["dpa"], "dpa", True),
        ("cookie", DISPLAY_TITLES["cookie"], "cookie", False),
        ("ai_terms", DISPLAY_TITLES["ai_terms"], "ai_terms", True),
        ("disclaimer", DISPLAY_TITLES["disclaimer"], "disclaimer", False),
        ("kvkk", DISPLAY_TITLES["kvkk"], "kvkk", True),
    ]
    with get_db_cursor() as cur:
        for dtype, title, file_key, req in meta:
            cur.execute(
                "SELECT 1 FROM legal_documents WHERE type = %s LIMIT 1",
                (dtype,),
            )
            if cur.fetchone():
                continue
            content = _read_seed_markdown(file_key)
            cur.execute(
                """
                INSERT INTO legal_documents (
                    type, title, content, version, version_number,
                    is_active, requires_acceptance, created_at, updated_at, published_by
                ) VALUES (%s, %s, %s, %s, %s, TRUE, %s, NOW(), NOW(), NULL)
                """,
                (dtype, title, content, "1.0", 1, req),
            )


def sync_active_documents_from_seed_files() -> int:
    """Overwrite **active** rows' title/content from `legal_seed_md/*.md` (one-off / after seed edits)."""
    if _use_inmemory():
        return 0
    updated = 0
    with get_db_cursor() as cur:
        for dtype in sorted(LEGAL_DOC_TYPES):
            content = _read_seed_markdown(dtype)
            title = str(DISPLAY_TITLES.get(dtype) or dtype)
            cur.execute(
                """
                UPDATE legal_documents
                SET title = %s, content = %s, updated_at = NOW()
                WHERE type = %s AND is_active = TRUE
                """,
                (title, content, dtype),
            )
            updated += int(cur.rowcount or 0)
    return updated


def get_active_document(doc_type: str) -> Optional[Dict[str, Any]]:
    if doc_type not in LEGAL_DOC_TYPES:
        return None
    if _use_inmemory():
        return None
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT id, type, title, content, version, version_number, is_active,
                   requires_acceptance, created_at, updated_at, published_by
            FROM legal_documents
            WHERE type = %s AND is_active = TRUE
            LIMIT 1
            """,
            (doc_type,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_document_by_type_and_version(doc_type: str, version: str) -> Optional[Dict[str, Any]]:
    if doc_type not in LEGAL_DOC_TYPES:
        return None
    if _use_inmemory():
        return None
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT id, type, title, content, version, version_number, is_active,
                   requires_acceptance, created_at, updated_at, published_by
            FROM legal_documents
            WHERE type = %s AND version = %s
            LIMIT 1
            """,
            (doc_type, version),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def list_active_summaries() -> List[Dict[str, Any]]:
    if _use_inmemory():
        return []
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT type, title, version, version_number, updated_at, requires_acceptance
            FROM legal_documents
            WHERE is_active = TRUE
            ORDER BY type
            """
        )
        return [dict(r) for r in (cur.fetchall() or [])]


def list_all_versions_for_type(doc_type: str) -> List[Dict[str, Any]]:
    if _use_inmemory():
        return []
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT id, type, title, version, version_number, is_active, requires_acceptance,
                   created_at, updated_at, published_by
            FROM legal_documents
            WHERE type = %s
            ORDER BY version_number DESC
            """,
            (doc_type,),
        )
        return [dict(r) for r in (cur.fetchall() or [])]


def _latest_accepted_version(user_id: str, doc_type: str) -> Optional[str]:
    if _use_inmemory():
        return None
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT document_version
            FROM user_legal_acceptances
            WHERE user_id = %s AND document_type = %s
            ORDER BY accepted_at DESC
            LIMIT 1
            """,
            (user_id, doc_type),
        )
        row = cur.fetchone()
        return str(row["document_version"]) if row else None


def acceptance_status_for_user(user_id: str, *, include_content: bool = False) -> Dict[str, Any]:
    if _use_inmemory():
        return {"all_accepted": True, "pending": []}
    pending: List[Dict[str, Any]] = []
    for t in required_acceptance_types():
        active = get_active_document(t)
        if not active:
            continue
        want = str(active["version"])
        got = _latest_accepted_version(user_id, t)
        if got is None or got != want:
            item: Dict[str, Any] = {
                "type": t,
                "title": active["title"],
                "latest_version": want,
                "user_accepted_version": got,
            }
            if include_content:
                item["content"] = active.get("content") or ""
            pending.append(item)
    return {"all_accepted": len(pending) == 0, "pending": pending}


def insert_acceptances(
    user_id: str,
    document_types: Sequence[str],
    method: str,
    ip_address: str,
    user_agent: str,
) -> None:
    """Append acceptance rows for current active version of each type."""
    if _use_inmemory():
        return
    ip_address = (ip_address or "")[:256]
    user_agent = (user_agent or "")[:2048]
    with get_db_cursor() as cur:
        for t in document_types:
            if t not in LEGAL_DOC_TYPES:
                raise ValueError(f"invalid document type: {t}")
            cur.execute(
                """
                SELECT version FROM legal_documents
                WHERE type = %s AND is_active = TRUE
                LIMIT 1
                """,
                (t,),
            )
            row = cur.fetchone()
            if not row:
                raise ValueError(f"no active document for type {t}")
            ver = str(row["version"])
            cur.execute(
                """
                INSERT INTO user_legal_acceptances (
                    user_id, document_type, document_version, accepted_at,
                    ip_address, user_agent, acceptance_method
                ) VALUES (%s, %s, %s, NOW(), %s, %s, %s)
                """,
                (user_id, t, ver, ip_address, user_agent, method),
            )


def _published_by_uuid(admin_user_id: Optional[str]) -> Optional[str]:
    if not admin_user_id:
        return None
    try:
        import uuid as _uuid

        _uuid.UUID(str(admin_user_id))
        return str(admin_user_id)
    except ValueError:
        return None


def publish_new_version(
    doc_type: str,
    title: str,
    content: str,
    requires_acceptance: bool,
    admin_user_id: Optional[str],
) -> Dict[str, Any]:
    if doc_type not in LEGAL_DOC_TYPES:
        raise ValueError("invalid type")
    if _use_inmemory():
        raise RuntimeError("legal publish unavailable in in-memory test mode")
    pub_by = _published_by_uuid(admin_user_id)
    with get_db_cursor() as cur:
        cur.execute("BEGIN")
        try:
            cur.execute(
                "SELECT COALESCE(MAX(version_number), 0) AS m FROM legal_documents WHERE type = %s",
                (doc_type,),
            )
            max_vn = int((cur.fetchone() or {}).get("m") or 0)
            new_vn = max_vn + 1
            new_version_label = f"1.{new_vn - 1}"
            cur.execute(
                "UPDATE legal_documents SET is_active = FALSE, updated_at = NOW() WHERE type = %s AND is_active = TRUE",
                (doc_type,),
            )
            cur.execute(
                """
                INSERT INTO legal_documents (
                    type, title, content, version, version_number,
                    is_active, requires_acceptance, created_at, updated_at, published_by
                ) VALUES (%s, %s, %s, %s, %s, TRUE, %s, NOW(), NOW(), %s)
                RETURNING id, type, title, version, version_number, requires_acceptance
                """,
                (doc_type, title, content, new_version_label, new_vn, requires_acceptance, pub_by),
            )
            row = dict(cur.fetchone())
            cur.execute("COMMIT")
            return row
        except Exception:
            cur.execute("ROLLBACK")
            raise


def activate_document_version(doc_id: str) -> Dict[str, Any]:
    """Rollback: set given row active and deactivate others of same type."""
    if _use_inmemory():
        raise RuntimeError("legal activate unavailable in in-memory test mode")
    with get_db_cursor() as cur:
        cur.execute("SELECT type FROM legal_documents WHERE id = %s::uuid", (doc_id,))
        r = cur.fetchone()
        if not r:
            raise ValueError("document not found")
        doc_type = str(r["type"])
        cur.execute("BEGIN")
        try:
            cur.execute(
                "UPDATE legal_documents SET is_active = FALSE, updated_at = NOW() WHERE type = %s",
                (doc_type,),
            )
            cur.execute(
                """
                UPDATE legal_documents SET is_active = TRUE, updated_at = NOW()
                WHERE id = %s::uuid
                RETURNING id, type, title, version, version_number
                """,
                (doc_id,),
            )
            row = cur.fetchone()
            cur.execute("COMMIT")
            return dict(row) if row else {}
        except Exception:
            cur.execute("ROLLBACK")
            raise


def audit_acceptances(
    *,
    user_id: Optional[str] = None,
    document_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    if _use_inmemory():
        return [], 0
    limit = min(max(limit, 1), 500)
    offset = max(offset, 0)
    conds: List[str] = []
    params: List[Any] = []
    if user_id:
        conds.append("a.user_id = %s::uuid")
        params.append(user_id)
    if document_type:
        conds.append("a.document_type = %s")
        params.append(document_type)
    if date_from:
        conds.append("a.accepted_at >= %s::timestamptz")
        params.append(date_from)
    if date_to:
        conds.append("a.accepted_at <= %s::timestamptz")
        params.append(date_to)
    where = ("WHERE " + " AND ".join(conds)) if conds else ""
    with get_db_cursor() as cur:
        cur.execute(
            f"SELECT COUNT(*) AS c FROM user_legal_acceptances a {where}",
            tuple(params),
        )
        total = int((cur.fetchone() or {}).get("c") or 0)
        cur.execute(
            f"""
            SELECT a.id, a.user_id, u.email AS user_email, a.document_type, a.document_version,
                   a.accepted_at, a.ip_address, a.user_agent, a.acceptance_method
            FROM user_legal_acceptances a
            LEFT JOIN users u ON u.id = a.user_id
            {where}
            ORDER BY a.accepted_at DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params) + (limit, offset),
        )
        rows = [dict(x) for x in (cur.fetchall() or [])]
    return rows, total


def backfill_migration_acceptances_for_all_users() -> int:
    """Insert migration_existing_user rows for every active user for required types at current active version."""
    if _use_inmemory():
        return 0
    types = required_acceptance_types()
    inserted = 0
    with get_db_cursor() as cur:
        cur.execute("SELECT id FROM users WHERE is_active IS NULL OR is_active = TRUE")
        users = [str(r["id"]) for r in (cur.fetchall() or [])]
        for uid in users:
            for t in types:
                cur.execute(
                    """
                    SELECT version FROM legal_documents WHERE type = %s AND is_active = TRUE LIMIT 1
                    """,
                    (t,),
                )
                vr = cur.fetchone()
                if not vr:
                    continue
                ver = str(vr["version"])
                cur.execute(
                    """
                    SELECT 1 FROM user_legal_acceptances
                    WHERE user_id = %s::uuid AND document_type = %s AND document_version = %s
                    LIMIT 1
                    """,
                    (uid, t, ver),
                )
                if cur.fetchone():
                    continue
                cur.execute(
                    """
                    INSERT INTO user_legal_acceptances (
                        user_id, document_type, document_version, accepted_at,
                        ip_address, user_agent, acceptance_method
                    ) VALUES (%s::uuid, %s, %s, NOW(), %s, %s, %s)
                    """,
                    (uid, t, ver, "0.0.0.0", "migration", "migration_existing_user"),
                )
                inserted += 1
    return inserted
