from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from typing import Any, Dict, Optional

from stores.users_store import read_users, verify_password
from stores.demo_store import purge_expired_demo_users

router = APIRouter(prefix="/api", tags=["auth"])


class LoginPayload(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str


def _norm_email(e: str) -> str:
    return (e or "").strip().lower()


def _norm(s: str) -> str:
    return " ".join((s or "").strip().split())


def _split_full_name(full_name: str) -> Dict[str, str]:
    """
    "Ali Veli Yılmaz" -> firstName="Ali", lastName="Veli Yılmaz"
    """
    parts = _norm(full_name).split(" ")
    if not parts:
        return {"firstName": "", "lastName": ""}
    if len(parts) == 1:
        return {"firstName": parts[0], "lastName": ""}
    return {"firstName": parts[0], "lastName": " ".join(parts[1:])}


@router.post("/login")
def login(payload: LoginPayload) -> Dict[str, Any]:
    email = _norm_email(payload.email)
    pw = (payload.password or "").strip()
    full_from_form = _norm(f"{payload.firstName} {payload.lastName}")

    # 1) NORMAL HAVUZ (users_pool.json)
    users = read_users()
    for u in users:
        if _norm_email(str(u.get("email") or "")) == email and verify_password(pw, str(u.get("hashed_password") or u.get("password") or "")):
            # OK (normal user)
            return {
                "status": "ok",
                "user": {
                    "firstName": u.get("firstName", payload.firstName),
                    "lastName": u.get("lastName", payload.lastName),
                    "email": email,
                    "is_demo": False,
                },
            }

    # 2) DEMO HAVUZ (demo_users.json) + EXPIRE TEMİZLİĞİ
    demo_users, _removed = purge_expired_demo_users()

    for du in demo_users:
        if _norm_email(str(du.get("email") or "")) != email:
            continue
        if not verify_password(pw, str(du.get("hashed_password") or du.get("password") or "")):
            continue

        # demo kaydı full_name ile tutuluyor olabilir
        demo_full = _norm(str(du.get("full_name") or du.get("name") or ""))

        # Name check: DEMO'DA tam eşleşme zorunlu DEĞİL.
        # Çünkü sen demo request’te bazen tek alan kullanıyorsun, bazen ayrık.
        # Yine de uyuşmuyorsa user'ı parçalayarak döndürüyoruz.
        name_parts = _split_full_name(demo_full or full_from_form)

        return {
            "status": "ok",
            "user": {
                "firstName": name_parts["firstName"] or payload.firstName,
                "lastName": name_parts["lastName"] or payload.lastName,
                "email": email,
                "is_demo": True,
                "expires_at": du.get("expires_at"),
            },
        }

    # BULUNAMADI -> 200 dönüyoruz ki axios catch'e düşüp "sunucu hatası" gibi davranmasın
    return {
        "status": "fail",
        "message": "Kullanıcı bulunamadı veya şifre hatalı.",
    }
