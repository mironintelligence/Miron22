import os
import sys
import json
import logging
import asyncio
from datetime import datetime
from typing import List, Dict, Any

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"))

from backend.db_async import db
from backend.pipeline.structuring import structurer
from backend.pipeline.segmentation import segmenter
from backend.pipeline.graph_engine import GraphEngine, AuthorityScorer
from backend.pipeline.vector_prep import vector_prep

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pipeline")

class LegalPipeline:
    def __init__(self):
        self.graph_engine = GraphEngine()
        self.scorer = None # Init after graph build
        
    async def run(self):
        logger.info("--- 🚀 STARTING LEGAL INTELLIGENCE PIPELINE ---")
        
        await db.init_pools()
        
        # 1. Fetch All Decisions (excluding raw_html to save memory/time)
        logger.info("📥 Fetching decisions from DB...")
        # Select specific columns
        query = """
            SELECT id, decision_no, decision_date, full_text, raw_json 
            FROM decisions
        """
        decisions = await db.fetch_all(query)
        logger.info(f"Loaded {len(decisions)} decisions.")
        
        if not decisions:
            logger.warning("No decisions found. Pipeline stopping.")
            return

        structured_docs = []
        
        # 2. Structure & Segment
        logger.info("⚙️ Structuring & Segmenting...")
        for row in decisions:
            doc = dict(row)
            
            # Structuring
            meta = structurer.extract_metadata(doc)
            
            # Segmentation
            segments = segmenter.segment(doc['full_text'])
            
            # Combine
            structured_doc = {**meta, "segments": segments, "full_text": doc['full_text']}
            structured_docs.append(structured_doc)
            
            # Save Structured JSON
            with open(f"backend/storage/structured/{meta['decision_id']}.json", "w") as f:
                json.dump(structured_doc, f, indent=2, default=str)
                
        # 3. Build Graph
        logger.info("🕸️ Building Citation Graph...")
        self.graph_engine.build_graph(structured_docs)
        self.graph_engine.export_metrics("backend/diagnostics/graph_metrics.json")
        
        # 4. Authority Scoring
        logger.info("🏆 Calculating Authority Scores...")
        self.scorer = AuthorityScorer(self.graph_engine.graph)
        scores = self.scorer.calculate_scores(structured_docs)
        
        # Add scores to docs
        for doc in structured_docs:
            doc['authority_score'] = scores.get(doc['decision_id'], 0.0)
            
        # 5. Vector Prep
        logger.info("🧠 Preparing Vector Chunks...")
        all_chunks = []
        for doc in structured_docs:
            chunks = vector_prep.prepare_chunks(doc)
            all_chunks.extend(chunks)
            
        # Save Vector Ready JSONL
        with open("backend/storage/vector_corpus.jsonl", "w") as f:
            for chunk in all_chunks:
                f.write(json.dumps(chunk, default=str) + "\n")
                
        # 6. Final Report
        logger.info("📊 Generating Final Report...")
        report = {
            "total_decisions": len(decisions),
            "total_chunks": len(all_chunks),
            "top_10_authority": sorted(structured_docs, key=lambda x: x.get('authority_score', 0), reverse=True)[:10],
            "timestamp": datetime.now().isoformat()
        }
        
        with open("backend/diagnostics/aym_intelligence_summary.json", "w") as f:
            json.dump(report, f, indent=2, default=str)
            
        logger.info("✅ PIPELINE COMPLETED SUCCESSFULLY")
        await db.close_pools()

if __name__ == "__main__":
    asyncio.run(LegalPipeline().run())
