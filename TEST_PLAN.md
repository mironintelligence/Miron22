# Test Planı

## Kapsam

### Backend
- Kimlik doğrulama ve yetkilendirme
- Admin uçları
- Fiyatlandırma, kupon ve yükseltme akışları
- Evrak analizi, asistan, RAG ve arama uçları
- Sözleşme şablonları, sözleşme analizi (metin + dosya), karşılaştırma, madde üretimi ve export
- Bildirimler ve dava hatırlatıcı
- Middleware zinciri (rate limit, CSRF, idempotency, timeout, security headers, logging)

### Frontend
- Navbar ve erişim kontrolü (admin/demoya göre menü)
- Ana menü modül kutucukları
- Sözleşme merkezi (şablonlar, oluşturma, analiz)
- Dava hatırlatıcı ekranı
- Bildirimler ekranı
- 3 saniyelik popup bildirim gösterimi

## Test Türleri

### Fonksiyonel
- Endpoint contract’ları (HTTP kodları, doğrulama, hata mesajları)
- Rol tabanlı erişim (admin-only ekran/route)
- Demo-only yükseltme görünürlüğü
- Şablon listeleme/çekme/oluşturma/analiz (metin+dosya)/karşılaştırma/madde üretimi/export
- Hatırlatıcı: çoklu hatırlatma zamanları ve arşiv
- Hatırlatıcı CRUD ve bildirim üretimi

### Regresyon
- Mevcut pytest senaryoları + yeni eklenen modüller

### Güvenlik (OWASP Top 10 odaklı)
- Kimlik doğrulama/bypass kontrolü
- Yetkisiz erişim denemeleri
- Rate limit/CSRF/idempotency header davranışı
- Bağımlılık zafiyet taraması (pip-audit, npm audit)
- Statik analiz (bandit)

### Performans/Yük/Stres
- In-process sağlık uç yük testi (çoklu thread)
- Var olan DB stres/doğrulama scriptleri

### Kullanılabilirlik ve Erişilebilirlik
- Kritik sayfalarda a11y taraması (axe)

## Metrikler
- Backend code coverage (pytest-cov)
- Cyclomatic complexity ve maintainability index (radon)
- Lint (frontend eslint)

## Çalıştırma Komutları

### Backend
- `python3 -m pytest -q`
- `python3 -m pytest -q --cov=backend --cov-report=term-missing`
- `python3 backend/scripts/run_security_scans.py`
- `python3 backend/scripts/run_quality_metrics.py`
- `python3 backend/scripts/load_test_inprocess.py`
 
## UAT
- [UAT_CHECKLIST.md](file:///Users/kerimaydemir/Miron-CLEAN/UAT_CHECKLIST.md)

### Frontend
- `npm -C frontend run lint`
- `npm -C frontend test:ci`
- `npm -C frontend run build`
