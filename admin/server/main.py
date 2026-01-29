from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import json, os

app = FastAPI(title="Libra AI Admin Backend", version="2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = "admin_data.json"
os.makedirs(os.path.dirname(DATA_PATH) or ".", exist_ok=True)
if not os.path.exists(DATA_PATH):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump({"users": {}}, f, ensure_ascii=False, indent=2)

def load_data():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(d):
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, indent=2)

@app.get("/")
def root():
    return {"status": "✅ Libra Admin çalışıyor"}

@app.get("/users")
def list_users():
    return load_data()["users"]

@app.post("/user/add")
def add_user(user: dict):
    data = load_data()
    key = f"{user['ad'].lower()}.{user['soyad'].lower()}"
    if key in data["users"]:
        raise HTTPException(400, "Kullanıcı zaten var")
    data["users"][key] = {
        "ad": user["ad"],
        "soyad": user["soyad"],
        "analiz_sayisi": 0,
        "assistant_konusma": 0,
        "toplam_sure_dk": 0,
        "aktif": True,
        "odeme_gunu": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "ortak_satin_alanlar": [],
        "cloud_dosyalar": [],
        "son_giris": datetime.now().strftime("%Y-%m-%d %H:%M"),
    }
    save_data(data)
    return {"ok": True}

@app.delete("/user/{key}")
def delete_user(key: str):
    data = load_data()
    if key not in data["users"]:
        raise HTTPException(404, "Bulunamadı")
    del data["users"][key]
    save_data(data)
    return {"ok": True}

@app.post("/user/update/{key}")
def update_user(key: str, update: dict):
    data = load_data()
    if key not in data["users"]:
        raise HTTPException(404, "Bulunamadı")
    data["users"][key].update(update)
    save_data(data)
    return {"ok": True}

@app.get("/stats")
def stats():
    d = load_data()["users"]
    return {
        "toplam_kullanici": len(d),
        "toplam_analiz": sum(u["analiz_sayisi"] for u in d.values()),
        "toplam_asistan": sum(u["assistant_konusma"] for u in d.values()),
        "ortalama_sure": round(sum(u["toplam_sure_dk"] for u in d.values()) / (len(d) or 1), 1),
    }
