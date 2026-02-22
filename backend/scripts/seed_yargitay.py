import os
import sys
import uuid
import json
import urllib.request
from typing import List, Dict, Any
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

try:
    from backend.openai_client import get_openai_client
except ImportError:
    from openai_client import get_openai_client

import psycopg2

load_dotenv()

def get_embedding(text: str) -> List[float]:
    client = get_openai_client()
    if not client:
        raise RuntimeError("OpenAI client not configured")
    resp = client.embeddings.create(input=[text], model="text-embedding-3-large")
    return resp.data[0].embedding

def load_decisions(source: str) -> List[Dict[str, Any]]:
    if source.startswith("http://") or source.startswith("https://"):
        with urllib.request.urlopen(source) as resp:
            raw = resp.read().decode("utf-8")
        lines = raw.splitlines()
    else:
        with open(source, "r", encoding="utf-8") as f:
            lines = f.read().splitlines()
    items = []
    for line in lines:
        if not line.strip():
            continue
        items.append(json.loads(line))
    return items

def seed_database():
    db_url = os.getenv("DATABASE_URL")
    source = os.getenv("DECISIONS_SOURCE")
    if not db_url or not source:
        raise RuntimeError("DATABASE_URL ve DECISIONS_SOURCE zorunludur.")

    decisions = load_decisions(source)
    if len(decisions) < 100:
        raise RuntimeError("En az 100 gerçek karar gerekli.")

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    for dec in decisions:
        clean_text = str(dec.get("clean_text") or "").strip()
        if not clean_text:
            continue
        embedding = get_embedding(clean_text)
        cur.execute(
            """
            INSERT INTO decisions (
                id, court, chamber, decision_date, decision_number,
                case_number, raw_text, clean_text, summary, outcome, embedding
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """,
            (
                str(uuid.uuid4()),
                dec.get("court"),
                dec.get("chamber"),
                dec.get("decision_date"),
                dec.get("decision_number"),
                dec.get("case_number"),
                dec.get("raw_text"),
                clean_text,
                dec.get("summary"),
                dec.get("outcome"),
                embedding,
            ),
        )
    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    seed_database()
