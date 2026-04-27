from __future__ import annotations

from datetime import datetime
from typing import Dict, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

# Audit log'da içerik saklamak KVKK Madde 12 ihlalidir.
# Bu model yalnızca metadata alanlarına izin verir.
_FORBIDDEN_KEYS = frozenset({
    "content", "text", "body", "response", "answer",
    "query_text", "file_content", "message", "prompt",
    "document", "extracted_text", "ai_response",
})

ActionType = Literal[
    "document_upload",
    "query",
    "search",
    "login",
    "logout",
    "session_expire",
    "password_change",
    "account_lock",
]

QueryType = Literal[
    "decision_search",
    "legislation",
    "risk_analysis",
    "contract_analysis",
    "pleading_generation",
    "assistant_chat",
]


class AuditMetadata(BaseModel):
    """Sadece metadata — içerik alanları yasak."""

    file_size: Optional[int] = Field(None, ge=0, description="Dosya boyutu (byte)")
    query_type: Optional[QueryType] = None
    filename_hash: Optional[str] = Field(None, max_length=64)
    extra: Optional[Dict[str, str]] = Field(None, description="Ek string metadata; içerik değil")

    @model_validator(mode="before")
    @classmethod
    def reject_content_keys(cls, values: dict) -> dict:
        extra = values.get("extra") or {}
        for k in extra:
            if k in _FORBIDDEN_KEYS:
                raise ValueError(
                    f"KVKK ihlali: audit metadata'da '{k}' anahtarı kullanılamaz"
                )
        return values


class AuditLogCreate(BaseModel):
    user_id: Optional[UUID] = None
    session_id: Optional[UUID] = None
    action_type: ActionType
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Optional[AuditMetadata] = None

    @property
    def to_store_dict(self) -> dict:
        """pg_users_store.log_audit'a uyumlu format."""
        meta = {}
        if self.metadata:
            if self.metadata.file_size is not None:
                meta["file_size"] = self.metadata.file_size
            if self.metadata.query_type:
                meta["query_type"] = self.metadata.query_type
            if self.metadata.filename_hash:
                meta["filename_hash"] = self.metadata.filename_hash
            if self.metadata.extra:
                meta.update(self.metadata.extra)
        return {
            "user_id": str(self.user_id) if self.user_id else None,
            "action": self.action_type,
            "resource": self.metadata.query_type if self.metadata else None,
            "details": meta or None,
            "ip": self.ip_address,
            "ua": self.user_agent,
        }


class AuditLogOut(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    session_id: Optional[UUID]
    action_type: Optional[str]
    action: str
    ip_address: Optional[str]
    file_size: Optional[int]
    query_type: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
