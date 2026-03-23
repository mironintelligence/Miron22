#!/usr/bin/env python3
"""
DATABASE_URL ile supabase/migrations/*.sql dosyasını uygular (psql veya psycopg2).
"""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    if load_dotenv:
        load_dotenv(root / ".env", override=True)
        load_dotenv(root.parent / ".env", override=True)

    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        print("DATABASE_URL tanımlı değil; migration atlandı.", file=sys.stderr)
        return 0

    sql_file = root.parent / "supabase" / "migrations" / "20250321140000_combined_rls_admin_miron.sql"
    if not sql_file.is_file():
        print(f"SQL bulunamadı: {sql_file}", file=sys.stderr)
        return 1

    try:
        subprocess.run(
            ["psql", url, "-v", "ON_ERROR_STOP=1", "-f", str(sql_file)],
            check=True,
        )
        print("OK: migration uygulandı:", sql_file)
        return 0
    except FileNotFoundError:
        pass
    except subprocess.CalledProcessError as e:
        print("psql hatası:", e, file=sys.stderr)
        return e.returncode or 1

    try:
        import psycopg2

        with open(sql_file, "r", encoding="utf-8") as f:
            sql = f.read()
        conn = psycopg2.connect(url)
        conn.autocommit = True
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.close()
        print("OK: migration psycopg2 ile uygulandı:", sql_file)
        return 0
    except Exception as e:
        print("psql yok ve psycopg2 başarısız:", e, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
