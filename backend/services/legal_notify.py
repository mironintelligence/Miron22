"""In-app + email fan-out when a legal document version is published."""

from __future__ import annotations

import logging
from typing import Any, Dict, List

from db import get_db_cursor
from services.mail_service import send_email
from stores.pg_users_store import _use_inmemory

logger = logging.getLogger("miron.legal_notify")


def fanout_legal_document_update(doc_type: str, title: str, version: str) -> Dict[str, Any]:
    """Best-effort: insert in-app notification per user; attempt email per user."""
    if _use_inmemory():
        return {"in_app": 0, "email_attempts": 0, "doc_type": doc_type}
    notif_title = (f"{title} güncellendi")[:255]
    notif_msg = (
        f"{title} belgesi sürüm {version} olarak güncellendi. "
        "Bir sonraki oturum açışınızda güncel metni okuyup kabul etmeniz gerekecek."
    )
    email_subject = f"Miron AI — {title} Güncellendi"
    email_body = (
        f"Merhaba,\n\n{title} güncellendi (sürüm {version}).\n\n"
        "Platforma giriş yaptığınızda yeni hukuki metni inceleyip kabul etmeniz istenecektir.\n\n"
        "— Miron AI\n"
    )
    n_inapp = 0
    n_email = 0
    rows: List[Dict[str, Any]] = []
    with get_db_cursor() as cur:
        cur.execute(
            """
            SELECT id::text AS id, email FROM users
            WHERE is_active IS NULL OR is_active = TRUE
            """
        )
        rows = [dict(r) for r in (cur.fetchall() or [])]

    with get_db_cursor() as cur:
        for row in rows:
            uid = str(row.get("id") or "")
            if not uid:
                continue
            try:
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, type, title, message)
                    VALUES (%s::uuid, %s, %s, %s)
                    """,
                    (uid, "legal_update", notif_title, notif_msg),
                )
                n_inapp += 1
            except Exception as e:
                logger.warning("legal fanout in-app failed", extra={"user_id": uid, "error": str(e)})

    for row in rows:
        em = str(row.get("email") or "").strip()
        if not em:
            continue
        try:
            send_email(em, email_subject, email_body)
            n_email += 1
        except Exception as e:
            logger.warning("legal fanout email failed", extra={"email": em, "error": str(e)})

    return {"in_app": n_inapp, "email_attempts": n_email, "doc_type": doc_type}
