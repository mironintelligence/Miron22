import asyncio
import os
import logging
from legal_crawler.pipeline import pipeline
from legal_crawler.models import LegalDocument
from db_async import db
from datetime import date

# Mock data generator for validation
async def generate_mock_docs(count=5):
    docs = []
    for i in range(count):
        docs.append(LegalDocument(
            type="law",
            title=f"Türk Medeni Kanunu Madde {i+1}",
            text=f"MADDE {i+1} - Bu kanun amacı şudur. Test içeriği {i+1}." * 50,
            date=date.today(),
            metadata={"source": "test_script"}
        ))
    return docs

async def validate():
    print("--- STARTING LEGAL CORPUS VALIDATION ---")
    
    # 1. DB Connection
    try:
        await db.init_pools()
        print("✅ DB Connection Successful")
    except Exception as e:
        print(f"❌ DB Connection Failed: {e}")
        return

    # 2. Ingestion Test
    print("\n--- INGESTION TEST ---")
    mock_docs = await generate_mock_docs(3)
    try:
        for doc in mock_docs:
            print(f"Ingesting: {doc.title}...")
            await pipeline.ingest_document(doc)
        print("✅ Ingestion Pipeline Triggered (Async)")
    except Exception as e:
        print(f"❌ Ingestion Failed: {e}")

    # 3. Verification Query
    print("\n--- VERIFICATION ---")
    try:
        # Check Docs
        count_docs = await db.fetch_one("SELECT COUNT(*) FROM legal_documents")
        print(f"Legal Documents: {count_docs['count']}")
        
        # Check Embeddings
        count_embs = await db.fetch_one("SELECT COUNT(*) FROM legal_embeddings")
        print(f"Legal Embeddings: {count_embs['count']}")
        
        if count_docs['count'] > 0 and count_embs['count'] > 0:
            print("✅ Data persisted successfully")
        else:
            print("⚠️ Data missing (might be async delay or embedding error)")
            
    except Exception as e:
        print(f"❌ Verification Query Failed: {e}")

    # 4. Search Test
    print("\n--- HYBRID SEARCH TEST ---")
    try:
        # We need a dummy embedding for test or call OpenAI
        # For validation script, we can skip actual embedding generation if we don't want to burn tokens,
        # OR we assume the previous step worked and we search "Medeni Kanun"
        
        # Let's try a simple text search part first via raw SQL to test function existence
        # The function requires a vector.
        # We can pass a zero vector for testing syntax
        zero_vec = [0.0] * 1536
        
        # Call function
        rows = await db.fetch_all("""
            SELECT * FROM search_legal_documents(
                $1, 'Medeni Kanun', 0.0, 5
            )
        """, zero_vec)
        
        print(f"Search Results: {len(rows)}")
        for r in rows:
            print(f" - {r['title']} (Score: {r['rank_score']:.4f})")
            
        print("✅ Search Function Callable")
        
    except Exception as e:
        print(f"❌ Search Test Failed: {e}")

    await db.close_pools()

if __name__ == "__main__":
    asyncio.run(validate())
