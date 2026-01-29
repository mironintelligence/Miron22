from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
import os, shutil, json
from datetime import datetime

router = APIRouter(prefix="/cloud", tags=["Cloud"])

# === kullanıcı dosya yolu yardımcıları ===
def user_key(first_name: str, last_name: str) -> str:
    return f"{first_name.strip().lower()}.{last_name.strip().lower()}"

def user_upload_dir(first_name: str, last_name: str) -> str:
    key = user_key(first_name, last_name)
    path = os.path.join("user_data", key, "uploads")
    os.makedirs(path, exist_ok=True)
    return path

def user_inbox_dir(first_name: str, last_name: str) -> str:
    key = user_key(first_name, last_name)
    path = os.path.join("user_data", key, "inbox")
    os.makedirs(path, exist_ok=True)
    return path

def user_history_file(first_name: str, last_name: str) -> str:
    key = user_key(first_name, last_name)
    path = os.path.join("user_data", key, "history.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"sent": [], "received": []}, f, ensure_ascii=False, indent=2)
    return path

def add_history(first_name: str, last_name: str, entry_type: str, data: dict):
    path = user_history_file(first_name, last_name)
    with open(path, "r", encoding="utf-8") as f:
        hist = json.load(f)
    hist[entry_type].append(data)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(hist, f, ensure_ascii=False, indent=2)

# ===== Listeleme =====
@router.get("/list")
def list_files(first_name: str = Query(...), last_name: str = Query(...)):
    try:
        udir = user_upload_dir(first_name, last_name)
        files = []
        for f in os.listdir(udir):
            p = os.path.join(udir, f)
            files.append({
                "name": f,
                "size_kb": round(os.path.getsize(p) / 1024, 2),
                "modified": datetime.fromtimestamp(os.path.getmtime(p)).strftime("%Y-%m-%d %H:%M:%S"),
            })
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== İndir =====
@router.get("/download/{filename}")
def download_file(filename: str, first_name: str = Query(...), last_name: str = Query(...)):
    p = os.path.join(user_upload_dir(first_name, last_name), filename)
    if not os.path.exists(p):
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    return FileResponse(p, filename=filename)

# ===== Sil =====
@router.delete("/delete/{filename}")
def delete_file(filename: str, first_name: str = Query(...), last_name: str = Query(...)):
    p = os.path.join(user_upload_dir(first_name, last_name), filename)
    if os.path.exists(p):
        os.remove(p)
        return {"status": "deleted"}
    return {"status": "not_found"}

# ===== Yeniden adlandır =====
@router.post("/rename")
def rename_file(first_name: str = Query(...), last_name: str = Query(...),
                old_name: str = Query(...), new_name: str = Query(...)):
    src = os.path.join(user_upload_dir(first_name, last_name), old_name)
    dst = os.path.join(user_upload_dir(first_name, last_name), new_name)
    if not os.path.exists(src):
        raise HTTPException(status_code=404, detail="Kaynak dosya yok")
    if os.path.exists(dst):
        raise HTTPException(status_code=400, detail="Hedef isim zaten var")
    os.rename(src, dst)
    return {"status": "renamed", "name": new_name}

# ===== Paylaş (Gönderici → Alıcı inbox) =====
@router.post("/share")
def share_file(sender_first: str = Query(...), sender_last: str = Query(...),
               receiver_key: str = Query(...), filename: str = Query(...)):
    spath = os.path.join(user_upload_dir(sender_first, sender_last), filename)
    if not os.path.exists(spath):
        raise HTTPException(status_code=404, detail="Gönderilecek dosya yok")
    inbox = os.path.join("user_data", receiver_key.lower(), "inbox")
    os.makedirs(inbox, exist_ok=True)

    dest_name = f"{filename}_from_{user_key(sender_first, sender_last)}"
    dpath = os.path.join(inbox, dest_name)
    shutil.copy2(spath, dpath)

    # 📜 Geçmiş kaydı oluştur
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    add_history(sender_first, sender_last, "sent", {
        "filename": filename,
        "to": receiver_key,
        "status": "pending",
        "date": now
    })
    r_first, r_last = receiver_key.split(".")
    add_history(r_first, r_last, "received", {
        "filename": filename,
        "from": user_key(sender_first, sender_last),
        "status": "pending",
        "date": now
    })

    return {"status": "pending", "delivered_to": receiver_key, "inbox_file": dest_name}

# ===== Inbox listele (alıcı tarafı) =====
@router.get("/inbox")
def list_inbox(first_name: str = Query(...), last_name: str = Query(...)):
    idir = user_inbox_dir(first_name, last_name)
    items = []
    for f in os.listdir(idir):
        p = os.path.join(idir, f)
        items.append({
            "name": f,
            "size_kb": round(os.path.getsize(p) / 1024, 2),
            "received": datetime.fromtimestamp(os.path.getmtime(p)).strftime("%Y-%m-%d %H:%M:%S"),
        })
    return {"inbox": items}

# ===== Paylaşımı onayla (inbox → uploads) =====
@router.post("/accept-share")
def accept_share(first_name: str = Query(...), last_name: str = Query(...),
                 inbox_name: str = Query(...)):
    src = os.path.join(user_inbox_dir(first_name, last_name), inbox_name)
    if not os.path.exists(src):
        raise HTTPException(status_code=404, detail="Inbox dosyası bulunamadı")

    if "_from_" in inbox_name:
        base = inbox_name.split("_from_")[0]
        sender_key = inbox_name.split("_from_")[1]
    else:
        base = inbox_name
        sender_key = "unknown"

    dst = os.path.join(user_upload_dir(first_name, last_name), base)
    shutil.move(src, dst)

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    add_history(first_name, last_name, "received", {
        "filename": base,
        "from": sender_key,
        "status": "accepted",
        "date": now
    })
    s_first, s_last = sender_key.split(".")
    add_history(s_first, s_last, "sent", {
        "filename": base,
        "to": user_key(first_name, last_name),
        "status": "accepted",
        "date": now
    })

    return {"status": "accepted", "moved_to": base}

# ===== Geçmiş Listele =====
@router.get("/history")
def get_history(first_name: str = Query(...), last_name: str = Query(...)):
    path = user_history_file(first_name, last_name)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data
