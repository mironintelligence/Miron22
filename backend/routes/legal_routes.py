"""Public and authenticated legal CMS API routes."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from legal_cms_config import LEGAL_DOC_TYPES, slug_to_document_type
from services.legal_cms_service import (
    acceptance_status_for_user,
    get_active_document,
    get_document_by_type_and_version,
    insert_acceptances,
    list_active_summaries,
    seed_v1_if_empty,
)
from user_auth import get_current_user
from utils.request_meta import client_meta

router = APIRouter(prefix="/api/legal", tags=["legal"])


@router.get("/documents")
def list_active_documents() -> Dict[str, Any]:
    try:
        seed_v1_if_empty()
    except Exception:
        pass
    docs = list_active_summaries()
    return {"documents": docs}


@router.get("/documents/{slug}")
def get_active_by_slug(slug: str) -> Dict[str, Any]:
    try:
        seed_v1_if_empty()
    except Exception:
        pass
    doc_type = slug_to_document_type(slug)
    if not doc_type:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")
    row = get_active_document(doc_type)
    if not row:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")
    return {"document": row}


@router.get("/documents/{slug}/version/{version}")
def get_version_by_slug(slug: str, version: str) -> Dict[str, Any]:
    doc_type = slug_to_document_type(slug)
    if not doc_type:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")
    row = get_document_by_type_and_version(doc_type, version)
    if not row:
        raise HTTPException(status_code=404, detail="Sürüm bulunamadı.")
    return {"document": row}


@router.get("/acceptance-status")
def legal_acceptance_status(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        seed_v1_if_empty()
    except Exception:
        pass
    uid = str(user.get("id") or "")
    return acceptance_status_for_user(uid, include_content=True)


class LegalAcceptBody(BaseModel):
    document_types: List[str] = Field(..., min_length=1)


@router.post("/accept")
def legal_accept(
    request: Request,
    body: LegalAcceptBody,
    user: Dict[str, Any] = Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        seed_v1_if_empty()
    except Exception:
        pass
    uid = str(user.get("id") or "")
    types = [str(t).strip() for t in body.document_types if str(t).strip()]
    for t in types:
        if t not in LEGAL_DOC_TYPES:
            raise HTTPException(status_code=400, detail=f"Geçersiz belge türü: {t}")
    ip, ua = client_meta(request)
    insert_acceptances(uid, types, "login_modal", ip, ua)
    return {"success": True}
