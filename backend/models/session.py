from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    user_id: UUID
    ip_address: str
    user_agent: Optional[str] = None
    device_fingerprint: Optional[str] = None
    refresh_token_hash: str
    expires_at: datetime


class SessionUpdate(BaseModel):
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    activity_count: Optional[int] = None
    logout_time: Optional[datetime] = None
    is_revoked: Optional[bool] = None
    revoked_reason: Optional[str] = None


class SessionOut(BaseModel):
    id: UUID
    user_id: UUID
    ip_address: str
    login_time: Optional[datetime]
    logout_time: Optional[datetime]
    last_activity: Optional[datetime]
    activity_count: int
    is_revoked: bool
    expires_at: datetime

    class Config:
        from_attributes = True
