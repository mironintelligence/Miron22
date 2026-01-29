# admin_backend/admin_panel.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import json, os
from datetime import datetime

app = FastAPI(title="Libra AI Admin Backend", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = "admin_data"
os.makedirs(DATA_DIR, exist_ok=True)

USERS_FILE = os.path.join(DATA_DIR, "users.json")
STATS_FILE = os.path.join(DATA_DIR, "stats.json")
LOGS_FILE = os.path.join(DATA_DIR, "logs.json")

def read_json(path):
    if not os.path.exists(path): return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def write_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.get("/")
def root():
    return {"message": "✅ Libra Admin Backend aktif"}

@app.get("/users")
def list_users():
    return read_json(USERS_FILE)

@app.post("/users/add")
def add_user(name: str, surname: str):
    users = read_json(USERS_FILE)
    key = f"{name.lower()}.{surname.lower()}"
    if key in users:
        raise HTTPException(400, "Bu kullanıcı zaten mevcut.")
    users[key] = {
        "ad": name, "soyad": surname, "analiz": 0, "asistan": 0,
        "kullanim_suresi": 0, "odeme_gunu": "Belirtilmedi", "aktif": True
    }
    write_json(USERS_FILE, users)
    return {"status": "ok", "user": key}

@app.delete("/users/delete/{key}")
def delete_user(key: str):
    users = read_json(USERS_FILE)
    if key not in users:
        raise HTTPException(404, "Kullanıcı bulunamadı.")
    del users[key]
    write_json(USERS_FILE, users)
    return {"status": "deleted"}

@app.get("/stats")
def get_stats():
    stats = read_json(STATS_FILE)
    users = read_json(USERS_FILE)
    return {
        "total_users": len(users),
        "total_analiz": sum(u.get("analiz", 0) for u in users.values()),
        "total_asistan": sum(u.get("asistan", 0) for u in users.values()),
        "total_sure": sum(u.get("kullanim_suresi", 0) for u in users.values()),
        "last_updated": stats.get("last_updated", datetime.now().isoformat())
    }

@app.post("/stats/update")
def update_stats():
    data = {
        "last_updated": datetime.now().isoformat()
    }
    write_json(STATS_FILE, data)
    return {"status": "ok"}
