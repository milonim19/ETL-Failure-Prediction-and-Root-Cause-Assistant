"""Light sanity rules before / after model — not a replacement for training."""

from __future__ import annotations

import re
from typing import Any

from .preprocessing_utils import clean_message, normalize_error_type, normalize_status

# High-recall failure hints in free text
FAIL_TEXT_PATTERNS = re.compile(
    r"(filenotfound|file not found|accessdenied|permission denied|403|401|timeout|"
    r"schema mismatch|broken pipe|out of memory)",
    re.I,
)
OK_TEXT_PATTERNS = re.compile(
    r"(completed successfully|status=ok|\bpass\b|finished: pass|committed partitions|rows=\d+.*success)",
    re.I,
)


def _get(d: dict[str, Any], key: str, default: Any = "") -> Any:
    return d.get(key, default)


def apply_pre_model_guard(payload: dict[str, Any]) -> tuple[str | None, str]:
    """
    If this returns (status, _), use that class and skip classifier for *label* only
    (calibrated score still blended lightly for API stability).
    Returns (None, reason) to defer to model.
    """
    st = normalize_status(_get(payload, "status"))
    et = normalize_error_type(_get(payload, "error_type"))
    retries = int(float(_get(payload, "retry_count", 0)))

    if st in {"success", "ok", "completed"} and et == "none":
        return "SUCCESS", "guardrail:clean_success_path"

    return None, "use_model"


def adjust_failure_probability(p_fail: float, payload: dict[str, Any]) -> float:
    """Shrink/grow raw failure probability using log-text heuristics."""
    msg = clean_message(_get(payload, "message", ""))
    retries = int(float(_get(payload, "retry_count", 0)))
    p = float(p_fail)
    p = max(1e-6, min(1.0 - 1e-6, p))

    if OK_TEXT_PATTERNS.search(msg) and not FAIL_TEXT_PATTERNS.search(msg):
        p = max(1e-6, p - 0.22)
    if FAIL_TEXT_PATTERNS.search(msg):
        p = min(1.0 - 1e-6, p + 0.12)
    if retries >= 4:
        p = min(1.0 - 1e-6, p + 0.06)
    return float(p)
