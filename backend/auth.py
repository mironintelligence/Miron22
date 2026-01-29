# =====================================================
# 🔐 JWT Auth System (Libra AI)
# =====================================================
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# === SABİTLER ===
SECRET_KEY = "super_secret_miron_libra_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 180  # 3 saat geçerli

# === HASH & ŞEMA ===
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# === Kullanıcılar (ileride DB'den çekilecek) ===
fake_users_db = {
    "kerim.aydemir": {
        "first_name": "Kerim",
        "last_name": "Aydemir",
        "hashed_password": pwd_context.hash("123456"),
        "role": "admin",
    }
}

# =====================================================
# 🔑 Yardımcı Fonksiyonlar
# =====================================================
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def authenticate_user(first_name: str, last_name: str, password: str):
    username_key = f"{first_name.lower()}.{last_name.lower()}"
    user = fake_users_db.get(username_key)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# =====================================================
# 👤 Token Doğrulama
# =====================================================
def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz kimlik doğrulama bilgisi.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username_key: str = payload.get("sub")
        if username_key is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = fake_users_db.get(username_key)
    if user is None:
        raise credentials_exception
    return user
