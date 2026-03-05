import asyncio
import logging
import sys
import os
from typing import List

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from backend.rag.pipeline import rag_pipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rag_validation")

async def run_validation():
    print("--- ⚖️ LEGAL RAG VALIDATION TEST ---")
    
    test_queries = [
        "Adil yargılanma hakkı ihlali nedir?",
        "Mülkiyet hakkına müdahale ölçütleri nelerdir?",
        "Tutukluluk süresinin makul olması ne demektir?",
        "İfade özgürlüğü sınırları AİHM kararlarına göre nasıldır?",
        "Kamulaştırmasız el atma tazminatı nasıl hesaplanır?",
        # Add more specific queries if needed
    ]
    
    passed = 0
    
    for i, q in enumerate(test_queries):
        print(f"\n📝 Query {i+1}: {q}")
        try:
            result = await rag_pipeline.run(q)
            
            if "error" in result:
                print(f"❌ Error: {result['error']}")
                continue
                
            answer = result.get('answer', '')
            sources = result.get('sources', [])
            
            print(f"✅ Answer Generated ({len(answer)} chars)")
            print(f"📚 Sources Cited: {len(sources)}")
            if len(sources) > 0:
                print(f"   First Source: {sources[0]}")
            
            # Simple validation criteria
            if len(answer) > 100 and len(sources) > 0:
                passed += 1
            else:
                print("⚠️ Validation Warning: Short answer or no sources.")
                
        except Exception as e:
            print(f"❌ Exception: {e}")
            
    print(f"\n--- VALIDATION SUMMARY ---")
    print(f"Total: {len(test_queries)}")
    print(f"Passed: {passed}")
    print(f"Success Rate: {passed/len(test_queries)*100:.1f}%")
    
    if passed == len(test_queries):
        print("\n🚀 LEGAL RAG PRODUCTION MODE ACTIVE")
    else:
        print("\n⚠️ RAG System Operational but some tests failed.")

if __name__ == "__main__":
    asyncio.run(run_validation())
