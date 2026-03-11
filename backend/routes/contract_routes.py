from fastapi import APIRouter, HTTPException, Depends, Body, status
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from db import get_db_cursor
from admin_auth import require_admin, get_current_user
from openai_client import get_openai_client
import json

router = APIRouter(prefix="/api/contracts", tags=["Contracts"])

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

# --- Endpoints ---

@router.get("/templates")
def list_templates(category: Optional[str] = None):
    """Mevcut sözleşme şablonlarını listele"""
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
        
        if not rows:
            return [t for t in MOCK_TEMPLATES if not category or t['category'] == category]
            
        return rows

@router.get("/templates/{template_id}")
def get_template(template_id: int):
    """Tekil şablon detayı"""
    # DB check
    with get_db_cursor() as cur:
        cur.execute("SELECT * FROM contract_templates WHERE id = %s", (template_id,))
        row = cur.fetchone()
        if row: return row

    # Mock check
    for t in MOCK_TEMPLATES:
        if t['id'] == template_id:
            return t
    
    raise HTTPException(status_code=404, detail="Şablon bulunamadı.")

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
