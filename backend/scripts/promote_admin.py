import os
import sys

from stores.pg_users_store import find_user_by_email, update_user_role


def main() -> int:
    email = (os.getenv("PROMOTE_EMAIL") or "").strip().lower()
    if not email:
        print("PROMOTE_EMAIL gerekli.")
        return 2
    u = find_user_by_email(email)
    if not u:
        print("Kullanıcı bulunamadı.")
        return 3
    ok = update_user_role(email, "admin")
    if not ok:
        print("Rol güncellenemedi.")
        return 4
    print("ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

