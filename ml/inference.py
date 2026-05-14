"""Shared inference: preprocessing + guardrails + sklearn pipelines."""

from __future__ import annotations

from typing import Any, Optional

import numpy as np
import pandas as pd

from ml.guardrails import adjust_failure_probability, apply_pre_model_guard
from ml.preprocessing_utils import prepare_features

# Display-only mapping applied after PASS/FAIL is chosen from unmapped ``p_adj``.
# Bounds avoid literal 0/1; shrink pulls saturated scores toward 0.5 so batch “avg confidence”
# on failures is less extreme without changing calibrated ``predict_proba`` or thresholds.
DISPLAY_CLIP_LOW = 0.04
DISPLAY_CLIP_HIGH = 0.88
DISPLAY_SHRINK_FACTOR = 0.78


def _display_probability(p_adj: float) -> float:
    p = float(np.clip(p_adj, DISPLAY_CLIP_LOW, DISPLAY_CLIP_HIGH))
    pulled = 0.5 + (p - 0.5) * DISPLAY_SHRINK_FACTOR
    return float(np.clip(pulled, DISPLAY_CLIP_LOW, DISPLAY_CLIP_HIGH))


def _row_df(payload: dict[str, Any]) -> pd.DataFrame:
    return prepare_features(pd.DataFrame([payload]))


def predict_etl(
    binary_model: Any,
    multi_model: Any,
    payload: dict[str, Any],
    *,
    fail_threshold: float = 0.6,
) -> dict[str, Any]:
    """
    Returns keys compatible with ModelService: probability, status, failure_type, metrics, message.
    """
    row = _row_df(payload)
    forced, _reason = apply_pre_model_guard(payload)
    # Calibrated binary model (trained with CalibratedClassifierCV + sigmoid)
    p_raw = float(binary_model.predict_proba(row)[0, 1])
    p_adj = adjust_failure_probability(p_raw, payload)

    if forced == "SUCCESS":
        p_adj = min(p_adj, 0.05)
        status = "SUCCESS"
    else:
        status = "FAIL" if p_adj >= fail_threshold else "SUCCESS"

    failure_type: Optional[str] = None
    if status == "FAIL":
        failure_type = str(multi_model.predict(row)[0])

    p_out = _display_probability(p_adj)

    metrics: dict[str, Any] = {
        "duration": payload.get("duration"),
        "retries": payload.get("retry_count"),
    }
    for optional_key in ("rows", "null_rate"):
        if optional_key in payload:
            metrics[optional_key] = payload[optional_key]

    return {
        "probability": p_out,
        "status": status,
        "failure_type": failure_type,
        "metrics": metrics,
        "message": payload.get("message"),
        "probability_raw_model": float(p_raw),
    }
