import base64
import hashlib
import hmac
import os
import struct
import time
from typing import Optional


def generate_base32_secret(length: int = 20) -> str:
    raw = os.urandom(int(length))
    return base64.b32encode(raw).decode("utf-8").replace("=", "")


def _normalize_secret(secret: str) -> bytes:
    s = (secret or "").strip().replace(" ", "").upper()
    pad = "=" * ((8 - (len(s) % 8)) % 8)
    return base64.b32decode(s + pad, casefold=True)


def totp_code(secret: str, for_time: Optional[int] = None, step: int = 30, digits: int = 6) -> str:
    t = int(for_time if for_time is not None else time.time())
    counter = int(t // int(step))
    key = _normalize_secret(secret)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    off = digest[-1] & 0x0F
    code_int = struct.unpack(">I", digest[off : off + 4])[0] & 0x7FFFFFFF
    mod = 10 ** int(digits)
    return str(code_int % mod).zfill(int(digits))


def verify_totp(secret: str, code: str, step: int = 30, digits: int = 6, window: int = 1) -> bool:
    c = (code or "").strip().replace(" ", "")
    if not c.isdigit():
        return False
    now = int(time.time())
    for w in range(-int(window), int(window) + 1):
        if totp_code(secret, for_time=now + (w * int(step)), step=step, digits=digits) == c:
            return True
    return False

