"""Çalışma anı bayrakları (DATA_DIR altındaki JSON vb.). auth_router gibi modüller admin_router'a bağlı kalmadan okur."""
from __future__ import annotations

import json
import os
from pathlib import Path


def _system_config_path() -> Path:
    return Path(os.getenv("DATA_DIR") or "data") / "system_config.json"


def maintenance_mode_enabled() -> bool:
    """Bakım modu, yalnızca MAINTENANCE_MODE_ENFORCE=true ise login'i bloke eder.

    Böylece stale data/system_config.json dosyası üretimde kalıcı 503 döngüsü oluşturmaz.
    """
    enforce = (os.getenv("MAINTENANCE_MODE_ENFORCE", "false") or "").strip().lower() == "true"
    if not enforce:
        return False
    try:
        p = _system_config_path()
        if not p.exists():
            return False
        with p.open("r", encoding="utf-8") as f:
            cfg = json.load(f)
        return bool(isinstance(cfg, dict) and cfg.get("maintenance_mode"))
    except Exception:
        return False
