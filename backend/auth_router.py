from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from backend.stores.users_store import get_user_by_email

router = APIRouter()

# Frontend'den gelecek veri modeli
class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(credentials: LoginRequest):
    print(f"Giriş denemesi: {credentials.email}")  # Terminalde görmek için log

    # 1. Kullanıcıyı bul (users_store.py içinden)
    user = get_user_by_email(credentials.email)
    
    # 2. Kullanıcı yoksa veya şifre yanlışsa hata fırlat
    # NOT: Kerim/2003 kontrolü burada yapılıyor.
    if not user:
        raise HTTPException(status_code=401, detail="Kullanıcı bulunamadı.")
    
    if user["hashed_password"] != credentials.password:
        raise HTTPException(status_code=401, detail="Şifre hatalı.")
    
    # 3. Başarılı ise kullanıcı bilgisini ve sahte token'ı dön
    return {
        "message": "Giriş Başarılı",
        "token": "fake-jwt-token-for-kerim-2026",
        "user": {
            "id": user["id"],
            "name": user["full_name"],
            "email": user["email"],
            "role": user["role"]
        }
    }