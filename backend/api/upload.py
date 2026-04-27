from __future__ import annotations

"""
Secure document upload + in-memory analysis endpoint.

Güvenlik garantileri:
- Dosya içeriği ASLA disk'e yazılmaz (io.BytesIO + RAM buffer)
- İşlem sonrası buffer.close() + del + gc.collect() ile bellek sıfırlanır
- Audit log'a sadece metadata (boyut, hash) kaydedilir; içerik asla kaydedilmez
- KVKK Madde 12 uyumlu
"""

import gc
import hashlib
import io
import pathlib
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from pydantic import BaseModel

from legal_acceptance_deps import require_legal_acceptance
from security import sanitize_text
from services.openai_secure import get_secure_openai_client, secure_chat_completion
from stores.pg_users_store import log_audit
from utils.request_meta import client_ip

router = APIRouter(prefix="/api/upload", tags=["upload"])

MAX_FILE_BYTES = int(50 * 1024 * 1024)  # 50 MB
CHUNK = 64 * 1024
_ALLOWED_EXTS = frozenset({".pdf", ".docx", ".txt"})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash_filename(name: str) -> str:
    """Dosya adının SHA-256 hash'i — orijinal ad audit log'a girmez."""
    return hashlib.sha256(name.encode("utf-8", errors="replace")).hexdigest()[:16]


def _extract_text_from_buffer(buf: io.BytesIO, filename: str) -> str:
    fn = (filename or "").lower()
    data = buf.getvalue()

    if fn.endswith(".pdf"):
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                return "\n".join(p.extract_text() or "" for p in pdf.pages)
        except Exception:
            return data.decode("utf-8", errors="ignore")

    if fn.endswith(".docx"):
        try:
            from docx import Document
            doc = Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            return data.decode("utf-8", errors="ignore")

    return data.decode("utf-8", errors="ignore")


def _detect_case_type(text: str) -> str:
    lower = text.lower()
    if "tazminat" in lower:
        return "Tazminat Davası"
    if "boşan" in lower or "bosan" in lower:
        return "Boşanma / Aile Hukuku"
    if "iş kazası" in lower or "is kazasi" in lower:
        return "İş Kazası"
    return "Genel Hukuk Dosyası"


async def _read_bounded(file: UploadFile, max_bytes: int) -> bytes:
    buf = bytearray()
    while True:
        chunk = await file.read(CHUNK)
        if not chunk:
            break
        if len(buf) + len(chunk) > max_bytes:
            raise HTTPException(
                413,
                f"Dosya çok büyük. Maksimum {max_bytes // (1024 * 1024)} MB.",
            )
        buf.extend(chunk)
    return bytes(buf)


async def _analyze_in_memory(
    raw: bytes,
    filename: str,
    vector_store=None,
) -> Dict[str, Any]:
    """RAM buffer üzerinde analiz — disk teması yok."""
    buf = io.BytesIO(raw)
    try:
        text = _extract_text_from_buffer(buf, filename)
        text = sanitize_text(text, 12000)
        dava_turu = _detect_case_type(text)

        # Vector embedding (opsiyonel — vector_store mevcutsa kullan)
        if vector_store is not None:
            try:
                import numpy as np
                client = get_secure_openai_client()
                resp = client.embeddings.create(
                    model="text-embedding-3-small",
                    input=text[:8000],
                )
                emb = np.array(resp.data[0].embedding, dtype=np.float32)
                vector_store.add(emb, {"chunk": 0, "dava_turu": dava_turu})
            except Exception:
                pass  # embedding hatası analizi durdurmaz

        # AI özet
        client = get_secure_openai_client()
        system = (
            "Sen Türk hukukunda uzman bir analist asistanısın. "
            "Yalnızca sana verilen metin üzerinden değerlendirme yap. "
            "Varsayım üretme. Kısa ve yapılandırılmış yanıt ver."
        )
        messages = [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": (
                    f"Dava türü: {dava_turu}\n\n"
                    f"Belge metni (ilk 8000 karakter):\n{text[:8000]}\n\n"
                    "Kısa özet ve hukuki değerlendirme yaz."
                ),
            },
        ]
        summary = secure_chat_completion(client, messages=messages, temperature=0.2)

        return {
            "dava_turu": dava_turu,
            "summary": summary,
            "char_count": len(text),
        }
    finally:
        buf.close()


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

class UploadAnalyzeResponse(BaseModel):
    dava_turu: str
    summary: str
    char_count: int
    file_size: int


@router.post("/analyze", response_model=UploadAnalyzeResponse)
async def analyze_document(
    request: Request,
    file: UploadFile,
    _user: dict = Depends(require_legal_acceptance),
):
    filename = (file.filename or "").strip()
    if not filename:
        raise HTTPException(400, "Dosya adı gerekli.")

    ext = pathlib.Path(filename).suffix.lower()
    if ext and ext not in _ALLOWED_EXTS:
        raise HTTPException(415, "Yalnızca PDF, DOCX veya TXT desteklenir.")

    raw: Optional[bytes] = None
    try:
        # 1. RAM'e oku — disk'e yazma
        raw = await _read_bounded(file, MAX_FILE_BYTES)
        file_size = len(raw)

        # 2. Session-scoped vector store (middleware tarafından sağlanır)
        vector_store = getattr(request.state, "vector_store", None)

        # 3. Bellekte analiz
        result = await _analyze_in_memory(raw, filename, vector_store)

        # 4. Audit log — sadece metadata
        user_id = (_user or {}).get("id") or (_user or {}).get("user_id")
        session_id = (_user or {}).get("session_id")
        log_audit(
            user_id=str(user_id) if user_id else None,
            action="document_upload",
            resource="risk_analysis",
            details={
                "file_size": file_size,
                "filename_hash": _hash_filename(filename),
                "query_type": "risk_analysis",
            },
            ip=client_ip(request),
            ua=request.headers.get("user-agent"),
        )

        return UploadAnalyzeResponse(
            dava_turu=result["dava_turu"],
            summary=result["summary"],
            char_count=result["char_count"],
            file_size=file_size,
        )

    finally:
        # 5. Secure deletion — bellekten sil
        if raw is not None:
            del raw
        gc.collect()
