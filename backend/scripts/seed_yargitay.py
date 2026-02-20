import os
import sys
import uuid
import datetime
import random
from typing import List, Dict, Any
from dotenv import load_dotenv

# Ensure backend path is available
sys.path.append(os.path.join(os.path.dirname(__file__), "../.."))

try:
    from backend.openai_client import get_openai_client
except ImportError:
    from openai_client import get_openai_client

import psycopg2
from psycopg2.extras import Json

load_dotenv()

# Sample data
SAMPLE_DECISIONS = [
    {
        "court": "Yargıtay",
        "chamber": "3. Hukuk Dairesi",
        "decision_number": "2023/1452 K.",
        "case_number": "2023/1023 E.",
        "date": "2023-11-15",
        "clean_text": "Taraflar arasındaki kira sözleşmesinden kaynaklanan tahliye davasında, kiracının kira bedelini eksik ödediği iddiası ispatlanamamıştır. Bilirkişi raporunda belirtilen ödemeler dikkate alındığında temerrüt oluşmadığı görülmüştür.",
        "summary": "Kira alacağı nedeniyle tahliye talebi reddedilmiştir.",
        "outcome": "ONAMA"
    },
    {
        "court": "Yargıtay",
        "chamber": "12. Hukuk Dairesi",
        "decision_number": "2022/8891 K.",
        "case_number": "2022/5678 E.",
        "date": "2022-05-20",
        "clean_text": "İtirazın iptali davasında, davalının imza inkarı üzerine yapılan incelemede, imzanın davalıya ait olduğu tespit edilmiştir. Bu nedenle itirazın haksız olduğu ve icra inkar tazminatına hükmedilmesi gerektiği sonucuna varılmıştır.",
        "summary": "İtirazın iptali ve icra inkar tazminatı talebi kabul edilmiştir.",
        "outcome": "BOZMA"
    },
    {
        "court": "Yargıtay",
        "chamber": "9. Hukuk Dairesi",
        "decision_number": "2021/3345 K.",
        "case_number": "2021/1122 E.",
        "date": "2021-03-10",
        "clean_text": "İşçi alacakları davasında, fazla mesai ücretlerinin tanık beyanlarına göre hesaplanması yerinde ise de, hakkaniyet indirimi yapılmadan hüküm kurulması hatalıdır. Ayrıca kıdem tazminatı faiz başlangıç tarihi konusunda yanılgıya düşülmüştür.",
        "summary": "Fazla mesai ücretinde hakkaniyet indirimi yapılmaması nedeniyle karar bozulmuştur.",
        "outcome": "BOZMA"
    },
    {
        "court": "Yargıtay",
        "chamber": "11. Hukuk Dairesi",
        "decision_number": "2020/7788 K.",
        "case_number": "2020/4455 E.",
        "date": "2020-09-25",
        "clean_text": "Ticari kredi sözleşmesinden kaynaklanan erken kapama komisyonu iadesi talebinde, bankanın talep ettiği komisyon oranının piyasa koşullarına uygun olup olmadığı araştırılmalıdır. Tüketici kredilerinden farklı olarak tacir olan davacı basiretli davranmak zorundadır.",
        "summary": "Ticari kredide erken kapama komisyonunun makul olup olmadığı araştırılmalıdır.",
        "outcome": "BOZMA"
    },
    {
        "court": "Yargıtay",
        "chamber": "17. Hukuk Dairesi",
        "decision_number": "2019/2233 K.",
        "case_number": "2019/1111 E.",
        "date": "2019-12-05",
        "clean_text": "Trafik kazasından kaynaklanan maddi ve manevi tazminat davasında, davacının maluliyet oranının Adli Tıp Kurumu raporu ile belirlenmesi gerekirken, yetersiz doktor raporuna dayalı hüküm kurulması isabetsizdir.",
        "summary": "Trafik kazası tazminatında maluliyet raporunun yetersizliği nedeniyle bozma.",
        "outcome": "BOZMA"
    }
]

def get_embedding(text: str) -> List[float]:
    client = get_openai_client()
    if not client:
        print("Warning: OpenAI client not configured, returning random vector")
        return [random.random() for _ in range(3072)]
    
    try:
        # text-embedding-3-large is 3072 dim by default
        resp = client.embeddings.create(input=[text], model="text-embedding-3-large")
        return resp.data[0].embedding
    except Exception as e:
        print(f"Embedding error: {e}")
        return [0.0] * 3072

def seed_database():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not set. Skipping DB insertion.")
        print("Here are the generated embeddings for verification:")
        for dec in SAMPLE_DECISIONS:
            emb = get_embedding(dec['clean_text'])
            print(f"Generated embedding for {dec['decision_number']} (len={len(emb)})")
        return

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        print("Connected to DB. Inserting decisions...")
        
        for dec in SAMPLE_DECISIONS:
            embedding = get_embedding(dec['clean_text'])
            
            sql = """
            INSERT INTO decisions (
                id, court, chamber, decision_number, case_number, 
                decision_date, clean_text, summary, outcome, embedding
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """
            
            cur.execute(sql, (
                str(uuid.uuid4()),
                dec['court'],
                dec['chamber'],
                dec['decision_number'],
                dec['case_number'],
                dec['date'],
                dec['clean_text'],
                dec['summary'],
                dec['outcome'],
                embedding
            ))
            
        conn.commit()
        cur.close()
        conn.close()
        print("Seed completed successfully.")
        
    except Exception as e:
        print(f"Database error: {e}")

if __name__ == "__main__":
    seed_database()
