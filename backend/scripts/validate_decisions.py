import os
import psycopg2

def validate():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL zorunludur.")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'decisions'
    """)
    cols = {r[0] for r in cur.fetchall()}
    required = {
        "id","court","chamber","decision_date","decision_number","case_number",
        "raw_text","clean_text","summary","outcome","embedding","created_at"
    }
    missing = required - cols
    if missing:
        raise RuntimeError(f"Eksik kolonlar: {sorted(list(missing))}")
    cur.execute("SELECT COUNT(*) FROM decisions")
    count = cur.fetchone()[0]
    if count <= 0:
        raise RuntimeError("decisions tablosu boş.")
    cur.execute("""
        SELECT indexname FROM pg_indexes
        WHERE tablename='decisions'
    """)
    indexes = {r[0] for r in cur.fetchall()}
    if not any("idx_embedding" in i for i in indexes):
        raise RuntimeError("idx_embedding indexi eksik.")
    if not any("idx_fulltext" in i for i in indexes):
        raise RuntimeError("idx_fulltext indexi eksik.")
    cur.close()
    conn.close()
    return {"ok": True, "count": count}

if __name__ == "__main__":
    print(validate())
