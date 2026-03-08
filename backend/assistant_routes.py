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

    # Use RAG Pipeline for intelligent retrieval and answering
    try:
        from rag.pipeline import rag_pipeline
        
        # If context is provided by frontend, prepend it to query for better retrieval context
        query = msg
        if req.context:
            query = f"{req.context}\n\n{msg}"
            
        result = await rag_pipeline.run(query)
        
        if "error" in result:
            # Fallback to simple chat if RAG fails (e.g. simulation mode check inside pipeline handles this, but just in case)
            raise Exception(result["error"])
            
        return {
            "reply": result.get("answer"),
            "sources": result.get("sources", []),
            "context_used": result.get("context_used", "")
        }

    except Exception as e:
        # Fallback to legacy behavior if RAG completely fails or is not initialized
        print(f"RAG Failed, falling back to legacy chat: {e}")
        try:
            client = get_openai_client()
            system = (
                "You are Libra Assistant. You help with Turkish law oriented analysis and strategy. "
                "Do not reveal secrets. Be concise and structured."
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
            raise HTTPException(status_code=500, detail=f"Assistant error: {e} | Fallback error: {fallback_err}")
