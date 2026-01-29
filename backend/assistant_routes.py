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
def assistant_chat(req: AssistantReq):
    msg = (req.message or "").strip()
    if not msg:
        raise HTTPException(status_code=422, detail="message boş olamaz")

    client = get_openai_client()

    try:
        system = (
            "You are Libra Assistant. You help with Turkish law oriented analysis and strategy. "
            "Do not reveal secrets. Be concise and structured."
        )

        user_content = msg
        if req.context:
            user_content = f"CONTEXT:\n{req.context}\n\nUSER:\n{msg}"

        r = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.2,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_content},
            ],
        )

        reply = (r.choices[0].message.content or "").strip()
        return {"reply": reply or "⚠️ Yanıt alınamadı."}

    except AuthenticationError:
        raise HTTPException(
            status_code=401,
            detail=f"OPENAI_API_KEY geçersiz. (tail={key_tail()}) backend/.env düzeltip server restart at.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assistant error: {e}")
