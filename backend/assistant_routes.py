from __future__ import annotations

import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from openai import AuthenticationError
from openai_client import get_openai_client, key_tail
from llm_gateway import chat_completions_create

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
            
            # chat_completions_create is a blocking HTTP call. Inside an async
            # endpoint we must offload it to a thread so the event loop can
            # continue serving other requests while the model responds.
            r = await asyncio.to_thread(
                chat_completions_create,
                client,
                model="gpt-4o-mini",
                temperature=0.2,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": msg},
                ],
            )
            reply = (r.choices[0].message.content or "").strip()
            return {"reply": reply or "⚠️ Yanıt alınamadı.", "sources": [], "fallback": True}
        except Exception as fallback_err:
            raise HTTPException(status_code=500, detail="Asistan hatası oluştu.")
