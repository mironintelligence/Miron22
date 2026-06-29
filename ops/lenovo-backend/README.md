# Lenovo Backend Mirror

Rol:

- Lenovo ana backend olabilir.
- Render yedek backend kalir.
- Supabase/Postgres tasinmaz; Lenovo backend ayni production env ile Supabase'e baglanir.
- LLM ve hukuk dataset zaten Lenovo'dadir.

Gerekenler:

- `/opt/miron-backend/app`: backend kod kopyasi
- `/opt/miron-backend/.env`: Render backend env degerleriyle ayni gizli ayarlar
- Cloudflare Tunnel: public HTTPS -> `http://127.0.0.1:8000`

Baslatma:

```bash
cd /opt/miron-backend
docker compose -f docker-compose.yml up -d
curl http://127.0.0.1:8000/api/health
```

Kaynak uyarisi:

Lenovo 8 GB RAM ve HDD ile 1-3 anlik kullanici icin makul. 5+ kullanicida LLM ve
dosya analiz endpointleri kuyruk/timeout yapabilir. Bu nedenle gateway timeout'u kisa tutulur
ve Render fallback devrede kalir.
