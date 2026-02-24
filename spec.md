# Miron Enterprise Security Upgrade Plan - Phase 2 (Hardening)

## 1. Authentication & JWT Hardening
- **JWT Claims:** `jti` (UUID) claim'i access ve refresh tokenlara eklenecek.
- **Clock Skew:** `jwt.decode` işleminde `leeway=30` saniye eklenecek.
- **Global Logout:** `users` tablosuna `token_version` (INT, default 1) alanı eklenecek. Token payload'ına `tv` claim'i eklenecek.
    - Doğrulama sırasında: `token.tv == user.token_version` kontrolü yapılacak.
    - Global Logout: `user.token_version += 1` işlemi ile kullanıcının tüm tokenları anında geçersiz kılınacak.

## 2. CSRF Protection (Double Submit Cookie)
- **Middleware:** `backend/middleware/csrf.py` içindeki `CSRFProtectionMiddleware` sınıfı `main.py` dosyasına eklenecek.
- **Frontend:** Login/Register yanıtlarında `csrf_token` cookie'si (HttpOnly=False) set edilecek. Frontend bu token'ı okuyup her POST/PUT/DELETE isteğinde `X-CSRF-Token` header'ı olarak geri gönderecek.

## 3. Password Policy Hardening
- **Validation:** `auth_router.py` içindeki `RegisterRequest` modelinde `password` alanı için custom validator eklenecek:
    - Min 12 karakter (Mevcut)
    - En az 1 Büyük Harf (`[A-Z]`)
    - En az 1 Küçük Harf (`[a-z]`)
    - En az 1 Rakam (`[0-9]`)
    - En az 1 Özel Karakter (`[!@#$%^&*(),.?":{}|<>]`)

## 4. Rate Limiting (Granular)
- **User-Based Limit:** `RateLimitMiddleware` güncellenerek, eğer request authenticated ise (`request.state.user` varsa) `rate_limit:user:{user_id}` anahtarı kullanılacak.
- **Policy Update:**
    - Login: 5 req / 1 min (IP based)
    - Admin: 30 req / 1 min (User ID based if logged in, else IP)
    - Global: 100 req / 1 min (User ID based)

## 5. Security Logging (SOC-Level)
- **Events:** `audit_logs` tablosuna aşağıdaki olaylar için özel loglama eklenecek:
    - `LOGIN_FAILED` (Reason: Bad Password / Locked / Not Found)
    - `ACCOUNT_LOCKED`
    - `REFRESH_REPLAY` (Critical!)
    - `IP_MISMATCH` (Token Fingerprint Error)
    - `ADMIN_ACCESS`
    - `RATE_LIMIT_EXCEEDED`

## 6. Secure Headers & Cookies
- **Cookies:** Tüm cookie set işlemlerinde `secure=True`, `httponly=True`, `samesite="strict"` zorunlu kılınacak.

## 7. Database Migration
- `users` tablosuna `token_version` sütunu eklenecek.
- `002_security_hardening.sql` migration dosyası oluşturulacak.
