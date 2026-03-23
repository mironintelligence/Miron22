import os
import sys
import json
import gc
import io
import logging
import asyncio
from datetime import datetime
from typing import List, Dict, Any

# Adjust path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from dotenv import load_dotenv

load_dotenv(
    os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", ".env"
    )
)

from db_async import db
from pipeline.structuring import structurer
from pipeline.segmentation import segmenter
from pipeline.graph_engine import GraphEngine, AuthorityScorer
from pipeline.vector_prep import vector_prep

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pipeline")

BATCH_SIZE = int(os.getenv("LEGAL_PIPELINE_BATCH_SIZE", "500"))


class LegalPipeline:
    def __init__(self):
        self.graph_engine = GraphEngine()
        self.scorer = None

    async def run(self):
        logger.info("--- 🚀 STARTING LEGAL INTELLIGENCE PIPELINE (batched, stateless) ---")

        await db.init_pools()

        base_sql = """
            SELECT id, decision_no, decision_date, full_text, raw_json
            FROM decisions
            ORDER BY id
        """

        structured_docs: List[Dict[str, Any]] = []
        all_chunks: List[Dict[str, Any]] = []
        total_rows = 0

        offset = 0
        while True:
            rows = await db.fetch_page(base_sql, BATCH_SIZE, offset)
            if not rows:
                break
            batch_n = len(rows)
            total_rows += batch_n
            logger.info("📥 Batch offset=%s rows=%s (total so far=%s)", offset, batch_n, total_rows)

            for row in rows:
                doc = dict(row)
                meta = structurer.extract_metadata(doc)
                segments = segmenter.segment(doc["full_text"])
                structured_doc = {**meta, "segments": segments, "full_text": doc["full_text"]}
                structured_docs.append(structured_doc)

            offset += batch_n
            gc.collect()

        logger.info("Loaded %s decisions in batches.", total_rows)

        if not structured_docs:
            logger.warning("No decisions found. Pipeline stopping.")
            await db.close_pools()
            return

        # 2. Graph (bellekte — disk yok)
        logger.info("🕸️ Building Citation Graph...")
        self.graph_engine.build_graph(structured_docs)
        graph_metrics = self.graph_engine.export_metrics(
            filepath="backend/diagnostics/graph_metrics.json" if os.getenv("PIPELINE_WRITE_DIAG_FILES", "").lower() == "true" else None
        )

        # 3. Authority Scoring
        logger.info("🏆 Calculating Authority Scores...")
        self.scorer = AuthorityScorer(self.graph_engine.graph)
        scores = self.scorer.calculate_scores(structured_docs)

        for doc in structured_docs:
            doc["authority_score"] = scores.get(doc["decision_id"], 0.0)

        # 4. Vector chunks — bellekte (BytesIO), diske jsonl yazılmaz
        logger.info("🧠 Preparing Vector Chunks (in-memory)...")
        vector_corpus_buf = io.BytesIO()
        for doc in structured_docs:
            chunks = vector_prep.prepare_chunks(doc)
            all_chunks.extend(chunks)
            for chunk in chunks:
                vector_corpus_buf.write((json.dumps(chunk, default=str) + "\n").encode("utf-8"))

        # 5. Özet rapor (isteğe bağlı dosya)
        logger.info("📊 Generating Final Report...")
        report = {
            "total_decisions": total_rows,
            "total_chunks": len(all_chunks),
            "top_10_authority": sorted(structured_docs, key=lambda x: x.get("authority_score", 0), reverse=True)[:10],
            "timestamp": datetime.now().isoformat(),
            "vector_corpus_bytes": vector_corpus_buf.tell(),
            "graph_metrics": graph_metrics,
        }

        if os.getenv("PIPELINE_WRITE_DIAG_FILES", "").lower() == "true":
            os.makedirs("backend/diagnostics", exist_ok=True)
            with open("backend/diagnostics/aym_intelligence_summary.json", "w") as f:
                json.dump(report, f, indent=2, default=str)

        del vector_corpus_buf
        del structured_docs
        gc.collect()

        logger.info("✅ PIPELINE COMPLETED SUCCESSFULLY")
        await db.close_pools()


if __name__ == "__main__":
    asyncio.run(LegalPipeline().run())
