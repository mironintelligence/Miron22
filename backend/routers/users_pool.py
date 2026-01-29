from fastapi import APIRouter, HTTPException, Request
from pathlib import Path
import json
from datetime import datetime, timezone

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[1]  # backend/
ADMIN_DATA_DIR = BASE_DIR / "data" / "admin"

PRIMARY_USERS_FILE = ADMIN_DATA_DIR / "users_pool.json"
FALLBACK_USERS_FILE = BASE_DIR / "users_pool.json"

PRIMARY_DEMO_USERS_FILE = ADMIN_DATA_DIR / "demo_users_pool.json"
FALLBACK_DEMO_USERS_FILE = BASE_DIR / "demo_users_pool.json"


def _pick_file(primary: Path, fallback: Path) -> Path:
  if primary.exists():
    return primary
  return fallback


USERS_FILE = _pick_file(PRIMARY_USERS_FILE, FALLBACK_USERS_FILE)
DEMO_USERS_FILE = _pick_file(PRIMARY_DEMO_USERS_FILE, FALLBACK_DEMO_USERS_FILE)


def load_json(file_path: Path, default):
  try:
    if not file_path.exists():
      file_path.parent.mkdir(parents=True, exist_ok=True)
      file_path.write_text(json.dumps(default, ensure_ascii=False, indent=2), encoding="utf-8")
      return default
    return json.loads(file_path.read_text(encoding="utf-8") or "null") or default
  except:
    return default


def save_json(file_path: Path, data):
  file_path.parent.mkdir(parents=True, exist_ok=True)
  file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _now_utc():
  return datetime.now(timezone.utc)


def _parse_dt(dt_str: str):
  if not dt_str:
    return None
  try:
    # accepts "...Z" or isoformat
    s = dt_str.strip()
    if s.endswith("Z"):
      s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s)
  except:
    return None


def cleanup_expired_demo_users(demo_users: list) -> list:
  now = _now_utc()
  kept = []
  changed = False

  for u in demo_users:
    exp = _parse_dt(u.get("expires_at"))
    if exp and exp <= now:
      changed = True
      continue
    kept.append(u)

  if changed:
    save_json(DEMO_USERS_FILE, kept)

  return kept


def _normalize(s: str) -> str:
  return (s or "").strip().lower()


def _match_name(record: dict, first_name: str, last_name: str, full_name: str) -> bool:
  rf = _normalize(record.get("firstName"))
  rl = _normalize(record.get("lastName"))
  rfull = _normalize(record.get("fullName"))

  fn = _normalize(first_name)
  ln = _normalize(last_name)
  full = _normalize(full_name)

  # If record has first/last, prefer that
  if rf or rl:
    if fn and ln:
      return rf == fn and rl == ln
    # fallback to full
    if full:
      return (rf + " " + rl).strip() == full
    return True  # don't hard fail name if not provided
  else:
    # record uses fullName
    if full:
      return rfull == full
    if fn and ln:
      return rfull == (fn + " " + ln).strip()
    return True


def _password_ok(record: dict, provided_password: str) -> bool:
  stored = (record.get("password") or "").strip()
  if not stored:
    # eski hesaplar: password yoksa engelleme yok (kırmayalım)
    return True
  return stored == (provided_password or "").strip()


@router.post("/api/login")
async def login(request: Request):
  data = await request.json()
  first_name = data.get("firstName", "")
  last_name = data.get("lastName", "")
  full_name = data.get("fullName", "")
  email = data.get("email", "")
  password = data.get("password", "")

  if not email or not str(email).strip():
    raise HTTPException(status_code=400, detail="email required")

  email_n = _normalize(email)

  # 1) Normal kullanıcı havuzu
  users = load_json(USERS_FILE, [])
  for u in users:
    if _normalize(u.get("email")) != email_n:
      continue
    if not _match_name(u, first_name, last_name, full_name):
      continue
    if not _password_ok(u, password):
      raise HTTPException(status_code=401, detail="invalid password")

    safe_user = {k: v for k, v in u.items() if k != "password"}
    safe_user["is_demo"] = False
    return {"status": "ok", "user": safe_user}

  # 2) Demo kullanıcı havuzu (süresi dolanı temizle)
  demo_users = load_json(DEMO_USERS_FILE, [])
  demo_users = cleanup_expired_demo_users(demo_users)

  for u in demo_users:
    if _normalize(u.get("email")) != email_n:
      continue
    if not _match_name(u, first_name, last_name, full_name):
      continue

    exp = _parse_dt(u.get("expires_at"))
    if exp and exp <= _now_utc():
      # safety: bir daha yazıp temizle
      cleanup_expired_demo_users(demo_users)
      raise HTTPException(status_code=401, detail="demo expired")

    if not _password_ok(u, password):
      raise HTTPException(status_code=401, detail="invalid password")

    safe_user = {k: v for k, v in u.items() if k != "password"}
    safe_user["is_demo"] = True
    return {"status": "ok", "user": safe_user}

  raise HTTPException(status_code=401, detail="user not found")