from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from openai import AuthenticationError
from openai_client import get_openai_client, key_tail

router = APIRouter()

class AssistantReq(BaseModel):
    message: str
    context: Optional[str] = ""
    chat_id: Optional[str] = None

@router.post("/assistant-chat")
async def assistant_chat(req: AssistantReq):
    msg = (req.message or "").strip()
    if not msg:
        raise HTTPException(status_code=422, detail="message boş olamaz")

    # RAG ile bağlama dayalı yanıt
    try:
        from rag.pipeline import rag_pipeline
        
        # Frontend bağlam gönderirse sorguya ekle
        query = msg
        if req.context:
            query = f"{req.context}\n\n{msg}"
            
        result = await rag_pipeline.run(query)
        
        if "error" in result:
            raise Exception(result["error"])
            
        return {
            "reply": result.get("answer"),
            "sources": result.get("sources", []),
            "context_used": result.get("context_used", "")
        }

    except Exception as e:
        print(f"RAG başarısız, klasik sohbet moduna dönülüyor: {e}")
        try:
            client = get_openai_client()
            system = (
                "Sen Miron Asistanısın. Türk hukuku odaklı analiz ve strateji önerileri sunarsın. "
                "Gizli bilgileri asla açıklama. Kısa, net ve yapılandırılmış yaz."
            )
            
            r = client.chat.completions.create(
                model="gpt-4o-mini",
                temperature=0.2,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": msg}, # Original message
                ],
            )
            reply = (r.choices[0].message.content or "").strip()
            return {"reply": reply or "⚠️ Yanıt alınamadı.", "sources": [], "fallback": True}
        except Exception as fallback_err:
            raise HTTPException(status_code=500, detail="Asistan hatası oluştu.")
