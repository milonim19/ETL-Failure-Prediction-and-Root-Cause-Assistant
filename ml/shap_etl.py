"""Grouped SHAP for the binary classifier (linear layer inside calibrated pipeline).

CalibratedClassifierCV applies a nonlinear Platt scaler on top of logits; explanations
summarize impacts from the logistic head on transformed sparse features (duration/retry/OHE/message
terms), aggregated to the five user-facing inputs.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Any

import numpy as np
import pandas as pd
import shap

from ml.preprocessing_utils import prepare_features


def build_default_background_frame(n_rows: int = 96, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    statuses = ["success", "failed", "error", "warning", "degraded", "completed"]
    ets = [
        "none",
        "timeout",
        "permission",
        "data_quality",
        "schema_mismatch",
        "missing_file",
        "upstream_dependency",
        "unknown",
    ]
    msgs = [
        "DAG completed successfully rows=90000",
        "dbt finished PASS freshness within SLA",
        "heartbeat lost execution_timeout exceeded",
        "DQ rule violation negative amount raw.orders",
        "403 Forbidden from object store",
        "Input path not found s3://lake/",
        "task=load committed partitions",
    ]
    rows: list[dict[str, Any]] = []
    for _ in range(n_rows):
        rows.append(
            {
                "duration": float(rng.uniform(8.0, 8000.0)),
                "retry_count": int(rng.integers(0, 8)),
                "status": str(rng.choice(statuses)),
                "error_type": str(rng.choice(ets)),
                "message": str(rng.choice(msgs)),
            }
        )
    return prepare_features(pd.DataFrame(rows))


def _aggregate_sparse_shap(names: np.ndarray, vector: np.ndarray) -> dict[str, float]:
    acc: dict[str, float] = defaultdict(float)
    if hasattr(vector, "toarray"):
        vector = np.asarray(vector.toarray()).ravel()
    else:
        vector = np.asarray(vector).ravel()
    m = min(len(names), len(vector))
    for i in range(m):
        nm = str(names[i])
        val = vector[i]
        if nm == "num__duration":
            acc["duration"] += float(val)
        elif nm == "num__retry_count":
            acc["retry_count"] += float(val)
        elif nm.startswith("cat__status"):
            acc["status"] += float(val)
        elif nm.startswith("cat__error_type"):
            acc["error_type"] += float(val)
        elif nm.startswith("msg__"):
            acc["message"] += float(val)
        else:
            acc["features"] += float(val)
    if acc.get("features", 0.0) != 0.0:
        acc["message"] += acc.pop("features", 0.0)
    return dict(acc)


def compute_binary_shap_for_row(
    binary_model: Any,
    prepared_row: pd.DataFrame,
    prepared_background: pd.DataFrame,
    *,
    max_features: int = 12,
) -> list[dict[str, Any]]:
    try:
        cal0 = binary_model.calibrated_classifiers_[0]
        pipe = cal0.estimator
        prep = pipe.named_steps["p"]
        lr = pipe.named_steps["lr"]

        if len(prepared_background) > 96:
            prepared_background = prepared_background.iloc[:96].reset_index(drop=True)

        Xt_bg = prep.transform(prepared_background)
        Xt_row = prep.transform(prepared_row)
        names = prep.get_feature_names_out()

        explainer = shap.LinearExplainer(lr, Xt_bg)
        sv = explainer.shap_values(Xt_row)

        if isinstance(sv, list):
            vec = sv[1] if len(sv) > 1 else sv[0]
        elif isinstance(sv, np.ndarray):
            vec = sv[0] if sv.ndim > 1 else sv
        else:
            vec = sv
        if hasattr(vec, "toarray"):
            vec = vec.toarray()
        agg = _aggregate_sparse_shap(names, np.asarray(vec).ravel())

        ordered = sorted(agg.items(), key=lambda kv: abs(kv[1]), reverse=True)[:max_features]
        return [{"feature": k, "impact": float(v)} for k, v in ordered]
    except Exception:
        return []
