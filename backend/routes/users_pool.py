# backend/routes/users_pool.py
from fastapi import APIRouter
import json, os
from typing import List, Dict

router = APIRouter()

FILE = "users_pool.json"

def read_users() -> List[Dict]:
    if not os.path.exists(FILE):
        return []
    try:
        with open(FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def write_users(data: List[Dict]):
    with open(FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

@router.get("/api/users")
def list_users():
    return read_users()