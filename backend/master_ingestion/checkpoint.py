import json
import os
import logging
from typing import Dict, Any, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("checkpoint")

class CheckpointManager:
    def __init__(self, filepath: str = "backend/storage/crawl_checkpoint.json"):
        self.filepath = filepath
        self.data = self._load()

    def _load(self) -> Dict[str, Any]:
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load checkpoint: {e}")
                return {}
        return {}

    def save(self):
        try:
            os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
            with open(self.filepath, "w") as f:
                json.dump(self.data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save checkpoint: {e}")

    def update_page(self, source: str, page: int):
        if source not in self.data:
            self.data[source] = {}
        self.data[source]["last_page"] = page
        self.save()

    def get_last_page(self, source: str) -> int:
        return self.data.get(source, {}).get("last_page", 1)

checkpoint = CheckpointManager()
