from fastapi import APIRouter, HTTPException, Depends, Body, Query
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from pydantic import BaseModel
from db import get_db_cursor
from admin_auth import require_admin
from user_auth import get_current_user
from openai_client import get_openai_client
import json
import os
import time
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

router = APIRouter(prefix="/api/contracts", tags=["Sözleşmeler"])

# --- Mock Data for Demo Templates ---
MOCK_TEMPLATES = [
    {
        "id": 1,
        "title": "İş Sözleşmesi (Belirsiz Süreli)",
        "category": "İş",
        "content": "Madde 1: Taraflar...\nMadde 2: Görev Tanımı...\nMadde 3: Ücret...\nMadde 4: Çalışma Süresi...",
        "description": "Standart personel iş sözleşmesi."
    },
    {
        "id": 2,
        "title": "Kira Sözleşmesi (Konut)",
        "category": "Kira",
        "content": "Madde 1: Kiralanan Yer...\nMadde 2: Kira Bedeli...\nMadde 3: Depozito...\nMadde 4: Kira Artışı...",
        "description": "TBK hükümlerine uygun konut kira kontratı."
    },
    {
        "id": 3,
        "title": "Gizlilik Sözleşmesi (NDA)",
        "category": "Ticari",
        "content": "Madde 1: Gizli Bilgi Tanımı...\nMadde 2: Tarafların Yükümlülükleri...\nMadde 3: Cezai Şart...",
        "description": "Şirketler arası bilgi paylaşımı için."
    },
     {
        "id": 4,
        "title": "Hizmet Alım Sözleşmesi",
        "category": "Ticari",
        "content": "Madde 1: Konu...\nMadde 2: Hizmetin Kapsamı...\nMadde 3: Ödeme Şartları...",
        "description": "Freelancer veya ajans hizmet alımları için."
    }
]

# --- Schema ---

class ContractAnalysisRequest(BaseModel):
    title: str
    content: str

class TemplateCreate(BaseModel):
    title: str
    category: str
    content: str
    description: Optional[str] = None

class ContractGenerateRequest(BaseModel):
    template_id: str
    values: Dict[str, Any] = {}

# --- Endpoints ---

@router.get("/templates")
def list_templates(category: Optional[str] = None, include_remote: bool = Query(False)):
    """Mevcut sözleşme şablonlarını listele"""
    items: List[Dict[str, Any]] = []
    # DB'den çek (Eğer tablo boşsa mock verileri kullan)
    sql = "SELECT * FROM contract_templates"
    if category:
        sql += " WHERE category = %s"
        params = (category,)
    else:
        params = ()
        
    with get_db_cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
        
        if rows:
            items.extend(rows)

    if not items:
        items.extend([t for t in MOCK_TEMPLATES if not category or t["category"] == category])

    if include_remote and (os.getenv("ENVIRONMENT") or "").lower() != "test":
        items.extend(_fetch_remote_templates(category=category))

    out: List[Dict[str, Any]] = []
    for t in items:
        if not isinstance(t, dict):
            continue
        row = dict(t)
        if "id" in row:
            row["id"] = str(row["id"])
        out.append(row)
    return out


_REMOTE_CACHE = {"ts": 0.0, "items": []}

def _default_source_urls() -> List[str]:
    return [
        "https://raw.githubusercontent.com/mironintelligence/Miron22/main/backend/contract_templates_public.json",
    ]

def _fetch_remote_templates(category: Optional[str] = None) -> List[Dict[str, Any]]:
    ttl = int(os.getenv("CONTRACT_TEMPLATE_REMOTE_TTL_SECONDS", "900"))
    now = time.time()
    if _REMOTE_CACHE["items"] and (now - float(_REMOTE_CACHE["ts"])) < ttl:
        items = list(_REMOTE_CACHE["items"])
        if category:
            items = [t for t in items if str(t.get("category") or "").lower() == str(category).lower()]
        return items

    raw = (os.getenv("CONTRACT_TEMPLATE_SOURCE_URLS") or "").strip()
    urls = [u.strip() for u in raw.split(",") if u.strip()] if raw else _default_source_urls()
    gathered: List[Dict[str, Any]] = []
    for u in urls:
        try:
            req = Request(u, headers={"User-Agent": "miron-ai"})
            with urlopen(req, timeout=8) as resp:
                data = resp.read().decode("utf-8", errors="replace")
            parsed = json.loads(data)
            if isinstance(parsed, list):
                for item in parsed:
                    if isinstance(item, dict):
                        gathered.append(item)
        except (URLError, HTTPError, ValueError):
            continue

    _REMOTE_CACHE["ts"] = now
    _REMOTE_CACHE["items"] = gathered

    if category:
        gathered = [t for t in gathered if str(t.get("category") or "").lower() == str(category).lower()]
    return gathered

@router.get("/templates/{template_id}")
def get_template(template_id: str):
    """Tekil şablon detayı"""
    tid = str(template_id)
    # DB check
    if tid.isdigit():
        with get_db_cursor() as cur:
            cur.execute("SELECT * FROM contract_templates WHERE id = %s", (int(tid),))
            row = cur.fetchone()
            if row:
                r = dict(row)
                r["id"] = str(r.get("id"))
                return r

    # Mock check
    for t in MOCK_TEMPLATES:
        if str(t.get("id")) == tid:
            row = dict(t)
            row["id"] = str(row.get("id"))
            return row

    for t in _fetch_remote_templates():
        if str(t.get("id")) == tid:
            row = dict(t)
            row["id"] = str(row.get("id"))
            return row
    
    raise HTTPException(status_code=404, detail="Şablon bulunamadı.")


@router.post("/generate")
def generate_contract(payload: ContractGenerateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    client = get_openai_client()
    if not client:
        raise HTTPException(status_code=500, detail="AI servisi kullanılamıyor.")

    tpl = get_template(payload.template_id)
    content = str(tpl.get("content") or "")
    title = str(tpl.get("title") or "Sözleşme")
    values = payload.values or {}

    prompt = f"""
Sen Türk hukukuna hakim, titiz bir sözleşme yazım uzmanısın.
Aşağıdaki şablonu kullanarak, verilen alan değerleri ile eksiksiz bir sözleşme metni üret.
Şablondaki {{...}} alanlarını uygun şekilde doldur.
Çelişen veya eksik bilgi varsa, kullanıcıya kısa bir not bırak ve makul varsayım yapma.

SÖZLEŞME BAŞLIĞI: {title}

ALAN DEĞERLERİ (JSON):
{json.dumps(values, ensure_ascii=False)}

ŞABLON:
{content[:15000]}
"""

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Çıktı sadece sözleşme metni olsun. Markdown kod bloğu kullanma."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        generated = (completion.choices[0].message.content or "").strip()

        sql = """
            INSERT INTO user_contracts (user_id, title, generated_content, created_at)
            VALUES (%s, %s, %s, NOW())
            RETURNING id
        """
        with get_db_cursor() as cur:
            cur.execute(sql, (user["id"], title, generated))
            row = cur.fetchone()
            cid = row["id"] if row else None

        return {"id": cid, "generated": generated}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Sözleşme oluşturulamadı.")

@router.post("/analyze")
def analyze_contract(payload: ContractAnalysisRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """
    AI ile Sözleşme Analizi (Risk, Güçlü/Zayıf Yönler)
    """
    client = get_openai_client()
    if not client:
        return {"error": "AI servisi kullanılamıyor."}

    prompt = f"""
    Sen uzman bir avukatsın. Aşağıdaki sözleşme metnini detaylıca analiz et.
    
    SÖZLEŞME BAŞLIĞI: {payload.title}
    METİN:
    {payload.content[:15000]}
    
    GÖREVİN:
    1. **Güçlü Yönler:** Sözleşmede hangi maddeler lehe veya sağlam?
    2. **Zayıf/Riskli Yönler:** Hangi maddeler muğlak, eksik veya aleyhe yorumlanabilir?
    3. **Gelecek Riskleri:** İleride doğabilecek uyuşmazlık noktaları neler?
    4. **Öneriler:** Nasıl güçlendirilebilir?

    Lütfen JSON formatında yanıt ver:
    {{
      "guclu_yonler": ["..."],
      "zayif_yonler": ["..."],
      "gelecek_riskleri": ["..."],
      "oneriler": ["..."],
      "genel_ozet": "..."
    }}
    """
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Sen Türk hukukuna hakim, titiz bir sözleşme analistisin."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        analysis = json.loads(completion.choices[0].message.content)
        
        # Sonucu DB'ye kaydet (Opsiyonel - Kullanıcı geçmişi için)
        sql = """
            INSERT INTO user_contracts (user_id, title, original_content, analysis_result)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """
        with get_db_cursor() as cur:
             cur.execute(sql, (user['id'], payload.title, payload.content, json.dumps(analysis)))
             contract_id = cur.fetchone()['id']
             
        return {"id": contract_id, "analysis": analysis}

    except Exception as e:
        return {"error": str(e)}

@router.post("/templates", dependencies=[Depends(require_admin)])
def create_template(payload: TemplateCreate):
    """Admin: Yeni şablon ekle"""
    sql = """
        INSERT INTO contract_templates (title, category, content, description)
        VALUES (%s, %s, %s, %s)
        RETURNING id
    """
    with get_db_cursor() as cur:
        cur.execute(sql, (payload.title, payload.category, payload.content, payload.description))
        return {"id": cur.fetchone()['id'], "message": "Şablon oluşturuldu."}
