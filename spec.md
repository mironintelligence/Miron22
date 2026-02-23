# Miron Enterprise Security Upgrade Plan

## 1. Veritabanı Migrasyonu (JSON -> PostgreSQL)
Mevcut dosya tabanlı (JSON) sistem, enterprise yükler için yetersizdir. PostgreSQL'e tam geçiş yapılacak.

### Tablo Şeması
```sql
-- Kullanıcılar (Rol bazlı)
CREATE TYPE user_role AS ENUM ('admin', 'user', 'demo');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    refresh_token_hash TEXT,
    demo_expires_at TIMESTAMPTZ -- Sadece demo kullanıcılar için
);

-- Oturumlar & Güvenlik
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    device_fingerprint TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_revoked BOOLEAN DEFAULT FALSE
);

-- Audit Log (Denetim İzleri)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- LOGIN, LOGOUT, VIEW_DOC, EXPORT, ADMIN_ACTION
    resource TEXT,        -- Hangi kaynak üzerinde işlem yapıldı
    details JSONB,        -- Ek detaylar
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndirim Kodları
CREATE TABLE discount_codes (
    code TEXT PRIMARY KEY,
    type TEXT CHECK (type IN ('percent', 'fixed')),
    value NUMERIC(10, 2) NOT NULL,
    max_usage INT,
    used_count INT DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kullanım Metrikleri (Analytics)
CREATE TABLE usage_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    feature_name TEXT NOT NULL,
    duration_seconds INT,
    meta_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. Authentication & Security (Hardening)
- **Redis Rate Limiting:** `backend/middleware/rate_limit.py` oluşturulacak. `redis-py` ile IP ve User ID bazlı sliding window rate limit uygulanacak.
- **Brute Force Koruması:** Redis üzerinde başarısız giriş denemeleri sayılacak. 5 başarısız denemede IP 15 dakika banlanacak.
- **Argon2 Hashing:** `passlib[argon2]` ile şifreleme standardı yükseltilecek.
- **Signed URL:** S3/Storage erişimleri için süreli (signed) URL mekanizması kurulacak.

## 3. RBAC (Role Based Access Control)
- **Middleware:** `backend/middleware/rbac.py` oluşturulacak. Her request'te `request.state.user` objesine rol bilgisi eklenecek.
- **Dependency:** `require_role("admin")` gibi dependency'ler ile endpoint koruması sağlanacak.
- **Demo Kısıtlaması:** Demo kullanıcılar için günlük sorgu limiti ve özellik kısıtlaması middleware seviyesinde yapılacak.

## 4. Admin Paneli & Frontend
- **Navigasyon:** `Navbar.jsx` içine `role === 'admin'` kontrolü ile "Admin Paneli" linki eklenecek.
- **Dashboard:** Chart.js entegrasyonu ile:
    - Günlük aktif kullanıcı sayısı.
    - En çok kullanılan özellikler.
    - Gelir/İndirim kodu kullanım grafiği.
- **Yönetim Sayfaları:**
    - Kullanıcı detay modalı (Son aktiviteler, IP logları).
    - İndirim kodu oluşturma/düzenleme formu.

## 5. RAG & Search İyileştirmesi
- **Safe Query:** `search.py` içindeki tüm SQL sorguları `%s` parametreleri ile güvenli hale getirilecek.
- **Fallback:** OpenAI embedding servisi yanıt vermezse keyword search (PostgreSQL `tsvector`) devreye girecek.

## 6. Test & Doğrulama
- **Pytest:** Auth flow, RBAC kontrolleri ve SQL Injection koruması için testler yazılacak.
- **Load Test:** Locust ile rate limit sınırları zorlanacak.
