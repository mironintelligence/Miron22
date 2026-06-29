# Miron API Failover Gateway

Bu Worker tek public API adresi olur.

Akis:

```text
Frontend -> Cloudflare Worker -> Lenovo backend
                         `-----> Render backend fallback
```

Neden Worker:

- Frontend iki backend adresi bilmez.
- Lenovo cevap vermezse Render'a otomatik duser.
- Render yedek kalir.
- CORS/cookie davranisi tek domain uzerinden daha temiz kalir.

Prod deploy sirasi:

1. Cloudflare Zero Trust panelinde named tunnel olustur.
2. Public hostname ekle: `lenovo-api.mironintelligence.com` -> `http://127.0.0.1:8000`.
3. Lenovo'da tunnel token ile connector kur:

```bash
TUNNEL_TOKEN='cloudflare_token_buraya' sudo -E bash ops/cloudflare/install-lenovo-tunnel-token.sh
```

4. Worker'i deploy et:

```bash
CLOUDFLARE_API_TOKEN='cloudflare_api_token_buraya' bash ops/cloudflare/deploy-worker.sh
```

5. Vercel frontend deploy et. `frontend/vercel.json` artik `https://api.mironintelligence.com` gateway adresine gider.

Quick tunnel test adresi su an sadece gecici smoke test icindir; restart veya Cloudflare karariyla degisebilir.

Guvenli fallback notu:

- GET/HEAD/OPTIONS ve network/timeout hatalarinda fallback dogal.
- POST/PUT/PATCH icin upstream `500` aldiginda otomatik tekrar varsayilan olarak kapali.
  Bunun nedeni primary backend DB'ye yazip sonra 500 donerse Render'a tekrar yazmak cift kayit
  uretebilir. Mutlaka istersen `FALLBACK_ON_MUTATING_5XX=true` yap.

Test:

```bash
node ops/failover-gateway/smoke-test.mjs
curl -i https://api.example.com/api/health
curl -i https://api.example.com/__gateway/health
```
