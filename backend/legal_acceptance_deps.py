"""Block authenticated API usage until required legal documents are accepted."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import Depends

from error_codes import AppError, ErrorCode
from services.legal_cms_service import acceptance_status_for_user, get_active_document
from stores.pg_users_store import _use_inmemory
from user_auth import get_current_user


def require_legal_acceptance(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if _use_inmemory():
        return user
    uid = str(user.get("id") or "")
    if not uid:
        return user
    st = acceptance_status_for_user(uid, include_content=False)
    if st.get("all_accepted"):
        return user
    pending: List[Dict[str, Any]] = []
    for p in st.get("pending") or []:
        t = str(p.get("type") or "")
        doc = get_active_document(t) if t else None
        if not doc:
            continue
        pending.append(
            {
                "type": t,
                "title": doc.get("title"),
                "version": doc.get("version"),
                "content": doc.get("content"),
            }
        )
    raise AppError(
        code=ErrorCode.LEGAL_ACCEPTANCE_REQUIRED,
        message="Güncel hukuki metinleri kabul etmeniz gerekiyor.",
        status_code=403,
        context={"requires_acceptance": True, "pending_documents": pending},
    )
