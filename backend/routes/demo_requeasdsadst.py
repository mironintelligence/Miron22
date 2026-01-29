from fastapi import APIRouter
from pydantic import BaseModel
import json, os
from datetime import datetime

router = APIRouter()

class DemoRequest(BaseModel):
    name: str
    email: str
    city: str | None = None
    lawFirm: str | None = None
    message: str | None = None

@router.post("/api/demo-request")
async def demo_request(req: DemoRequest):
    os.makedirs("data", exist_ok=True)
    file_path = "data/demo_requests.json"

    # Önce eski kayıtları al
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        data = []

    # Yeni kayıt ekle
    new_entry = {
        "id": len(data) + 1,
        "name": req.name,
        "email": req.email,
        "city": req.city or "-",
        "lawFirm": req.lawFirm or "-",
        "message": req.message or "-",
        "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    data.append(new_entry)

    # JSON dosyasına kaydet
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return {"status": "success", "message": "Demo isteği kaydedildi."}
@router.get("/api/demo-requests")
async def get_demo_requests():
    file_path = "data/demo_requests.json"
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        data = []
    return data

@router.post("/api/reject-demo")
async def reject_demo(data: dict):
    file_path = "data/demo_requests.json"
    if not os.path.exists(file_path):
        return {"status": "error", "message": "Kayıt bulunamadı"}
    with open(file_path, "r", encoding="utf-8") as f:
        demos = json.load(f)
    demos = [d for d in demos if d["id"] != data.get("id")]
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(demos, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

@router.post("/api/approve-demo")
async def approve_demo(data: dict):
    file_path = "data/demo_requests.json"
    if not os.path.exists(file_path):
        return {"status": "error"}
    with open(file_path, "r", encoding="utf-8") as f:
        demos = json.load(f)
    for d in demos:
        if d["id"] == data.get("id"):
            d["approved"] = True
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(demos, f, ensure_ascii=False, indent=2)
    return {"status": "ok"}

class DemoRequest(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str
    password: str   # ✔ Şifre eklendi