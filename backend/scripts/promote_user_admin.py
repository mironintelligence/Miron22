import sys

from stores.pg_users_store import update_user_role


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python3 backend/scripts/promote_user_admin.py <email>")
        return 2
    email = sys.argv[1].strip()
    ok = update_user_role(email, "admin")
    if not ok:
        print("User not found")
        return 1
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

