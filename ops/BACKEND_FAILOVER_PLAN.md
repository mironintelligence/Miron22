# Backend Failover Plani

Mevcut durum:

- Frontend production'da API base olarak ayni origin'i kullaniyor.
- `frontend/vercel.json` su an API rewrite'larini direkt `https://miron22.onrender.com` adresine gonderiyor.
- Backend FastAPI.
- LLM cagri merkezi: `backend/llm_gateway.py`.
- DB/Supabase ortak kalirsa Lenovo backend kalici veri tasimaz.

Hedef durum:

```text
Frontend
  -> Cloudflare Worker API gateway
       -> primary: Lenovo backend Cloudflare Tunnel URL
       -> fallback: https://miron22.onrender.com
```

Lenovo'da calisacaklar:

- Ollama: `qwen2.5:1.5b-instruct`
- Hukuk dataset kasasi: `/srv/miron-law-data/hf/mironlaw-train-data`
- Opsiyonel ana backend: `miron-backend` container

Render'da kalacaklar:

- Yedek backend
- Ayni env degerleri
- Ayni Supabase/Postgres baglantisi

Onemli riskler:

- Ev interneti / elektrik / Wi-Fi koparsa Worker Render'a duser.
- Lenovo HDD oldugu icin PDF/DOCX analiz ve yogun RAG isleri gecikebilir.
- POST/PUT/PATCH isteklerinde 500 uzerine otomatik fallback cift yazim riski tasir.
  Worker varsayilan olarak mutating 5xx retry yapmaz.
- Auth cookie domain ve CORS icin frontend tek gateway domain'ini kullanmali.

Yapilacak deploy adimlari:

1. Lenovo'ya backend kodunu `/opt/miron-backend/app` olarak koy.
2. Render'daki backend env degerlerini `/opt/miron-backend/.env` icine koy.
3. `ops/lenovo-backend/docker-compose.yml` dosyasini Lenovo'da `/opt/miron-backend/docker-compose.yml` yap.
4. Backend container'i baslat.
5. Cloudflare Tunnel ile Lenovo `127.0.0.1:8000` adresini public HTTPS'e ac.
6. `ops/failover-gateway/worker.js` Worker'ini deploy et.
7. `frontend/vercel.json` rewrite destination'larini Worker/custom API domain'e cevir.

Basarili kabul kriterleri:

- `GET /api/health` gateway uzerinden 200 doner.
- Lenovo backend kapatilinca ayni endpoint Render'dan 200 doner.
- `X-Miron-Backend: primary` veya `fallback` response header'i gorulur.
- `POST /assistant-chat` Lenovo saglikliyken primary'den yanit verir.
- Lenovo kapaliyken Render fallback calisir.
