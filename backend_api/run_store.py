from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from threading import Lock
from typing import List

from .schemas import PredictionResponse

logger = logging.getLogger(__name__)

DEFAULT_CACHE_DIR = Path(__file__).resolve().parent / "data"
DEFAULT_CACHE_FILE = DEFAULT_CACHE_DIR / "run_history.json"
DEFAULT_MAX_RUNS = 200


def _resolve_cache_path() -> Path:
    override = os.getenv("ETLPRED_RUN_STORE_PATH")
    if override:
        return Path(override).expanduser().resolve()
    return DEFAULT_CACHE_FILE


class RunStore:
    """In-memory run history with a small JSON file cache.

    The JSON file lets the homepage show recent runs after an API restart
    (sufficient for a demo / single-process deployment; not a real database).
    """

    def __init__(
        self,
        cache_path: Path | None = None,
        max_runs: int = DEFAULT_MAX_RUNS,
    ) -> None:
        self._runs: List[PredictionResponse] = []
        self._lock = Lock()
        self._cache_path: Path = cache_path or _resolve_cache_path()
        self._max_runs = max(1, int(max_runs))
        self._load_from_disk()

    def add(self, run: PredictionResponse) -> None:
        with self._lock:
            self._runs.insert(0, run)
            if len(self._runs) > self._max_runs:
                self._runs = self._runs[: self._max_runs]
            self._persist_locked()

    def list(self, limit: int) -> List[PredictionResponse]:
        with self._lock:
            return self._runs[:limit]

    def clear(self) -> None:
        with self._lock:
            self._runs = []
            self._persist_locked()

    def _load_from_disk(self) -> None:
        path = self._cache_path
        if not path.exists():
            return
        try:
            raw = path.read_text(encoding="utf-8")
            data = json.loads(raw) if raw.strip() else []
            if not isinstance(data, list):
                return
            loaded: List[PredictionResponse] = []
            for item in data:
                if not isinstance(item, dict):
                    continue
                try:
                    loaded.append(PredictionResponse.model_validate(item))
                except Exception as exc:  # noqa: BLE001 - skip bad cache entries
                    logger.warning("Skipping invalid cached run: %s", exc)
            with self._lock:
                self._runs = loaded[: self._max_runs]
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Failed to read run cache %s: %s", path, exc)

    def _persist_locked(self) -> None:
        path = self._cache_path
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            payload = [run.model_dump(mode="json") for run in self._runs]
            path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        except OSError as exc:
            logger.warning("Failed to persist run cache to %s: %s", path, exc)
