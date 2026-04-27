from __future__ import annotations

"""
Session-scoped, RAM-only vector store.

Disk'e asla yazılmaz. Session kapanınca clear() ile bellekten silinir.
FAISS kurulu ise kullanılır; değilse saf numpy ile L2 arama yapılır.
"""

import gc
import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

try:
    import faiss  # type: ignore
    _FAISS_AVAILABLE = True
except ImportError:
    _FAISS_AVAILABLE = False
    logger.info("faiss bulunamadı; numpy tabanlı vektör arama aktif.")


class InMemoryVectorStore:
    """
    Session başına oluşturulur, hiçbir zaman disk'e dokunmaz.

    Kullanım:
        store = InMemoryVectorStore(dimension=1536)
        store.add(embedding_array, {"chunk_id": 0, "page": 1})
        results = store.search(query_embedding, k=5)
        store.clear()  # session sonunda çağrılır
    """

    def __init__(self, dimension: int = 1536):
        self.dimension = dimension
        self._meta: Dict[int, dict] = {}
        self._counter: int = 0

        if _FAISS_AVAILABLE:
            self._index = faiss.IndexFlatL2(dimension)
            self._backend = "faiss"
        else:
            self._vectors: List[np.ndarray] = []
            self._index = None
            self._backend = "numpy"

    # ------------------------------------------------------------------
    def add(self, embedding: np.ndarray, metadata: dict) -> int:
        vec = np.asarray(embedding, dtype=np.float32).reshape(1, self.dimension)
        if self._backend == "faiss":
            self._index.add(vec)
        else:
            self._vectors.append(vec.squeeze())
        idx = self._counter
        self._meta[idx] = metadata
        self._counter += 1
        return idx

    # ------------------------------------------------------------------
    def search(
        self, query_embedding: np.ndarray, k: int = 5
    ) -> List[Tuple[dict, float]]:
        if self._counter == 0:
            return []
        k = min(k, self._counter)
        q = np.asarray(query_embedding, dtype=np.float32).reshape(1, self.dimension)

        if self._backend == "faiss":
            distances, indices = self._index.search(q, k)
            return [
                (self._meta[int(i)], float(distances[0][rank]))
                for rank, i in enumerate(indices[0])
                if int(i) in self._meta
            ]
        else:
            # Numpy L2
            mat = np.stack(self._vectors)          # (N, D)
            diffs = mat - q                        # (N, D)
            dists = np.sum(diffs ** 2, axis=1)    # (N,)
            top_k = np.argsort(dists)[:k]
            return [(self._meta[int(i)], float(dists[i])) for i in top_k]

    # ------------------------------------------------------------------
    def clear(self) -> None:
        """Session kapanınca çağrılır — tüm vektör verisini bellekten siler."""
        self._meta.clear()
        self._counter = 0
        if self._backend == "faiss" and self._index is not None:
            del self._index
            self._index = None
        elif self._backend == "numpy":
            self._vectors.clear()
        gc.collect()

    # ------------------------------------------------------------------
    def __len__(self) -> int:
        return self._counter

    def __repr__(self) -> str:
        return (
            f"<InMemoryVectorStore backend={self._backend} "
            f"dim={self.dimension} count={self._counter}>"
        )


# ---------------------------------------------------------------------------
# FastAPI middleware helper
# ---------------------------------------------------------------------------

def make_vector_store_middleware(dimension: int = 1536):
    """
    Her HTTP isteğine session-scoped InMemoryVectorStore bağlar.
    Response tamamlandıktan sonra otomatik temizler.

    Kullanım (main.py):
        from services.vector_memory import make_vector_store_middleware
        app.middleware("http")(make_vector_store_middleware())
    """
    async def middleware(request, call_next):
        request.state.vector_store = InMemoryVectorStore(dimension=dimension)
        try:
            response = await call_next(request)
        finally:
            vs = getattr(request.state, "vector_store", None)
            if vs is not None:
                vs.clear()
        return response

    return middleware
