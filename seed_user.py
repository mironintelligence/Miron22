import os
import hashlib
import base64
import json
from pathlib import Path

iters = 210000
salt = os.urandom(16)
pw = "Azra2003?".encode("utf-8")
dk = hashlib.pbkdf2_hmac("sha256", pw, salt, iters)

def b64e(b): return base64.urlsafe_b64encode(b).decode("utf-8").rstrip("=")
hashed = f"pbkdf2_sha256${iters}${b64e(salt)}${b64e(dk)}"

user = {
    "email": "mironintelligence@gmail.com",
    "firstName": "Kerim",
    "lastName": "Aydemir",
    "hashed_password": hashed,
    "is_demo": False,
    "role": "admin",
    "created_at": "2024-01-01T00:00:00+00:00"
}

data_dir = Path("data")
data_dir.mkdir(exist_ok=True)
users_file = data_dir / "users.json"

users = []
if users_file.exists():
    try:
        with open(users_file, "r") as f:
            users = json.load(f)
    except:
        users = []

users = [u for u in users if u.get("email") != user["email"]]
users.append(user)

with open(users_file, "w") as f:
    json.dump(users, f, indent=2)

print("User added successfully")
