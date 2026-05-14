"""String normalization + training labels shared by train/inference."""

from __future__ import annotations

import re
from typing import Any

import numpy as np
import pandas as pd

STATUS_MAP = {
    "sucess": "success",
    "succsess": "success",
    "sucsess": "success",
    "failed": "failed",
    "fail": "failed",
    "failure": "failed",
    "faild": "failed",
    "degradedd": "degraded",
    "timedout": "timeout",
}

ERROR_MAP = {
    "schem_mismatch": "schema_mismatch",
    "permissions": "permission",
    "perms": "permission",
    "permision": "permission",
    "timeouts": "timeout",
    "timeot": "timeout",
    "file_not_found": "missing_file",
    "missingfile": "missing_file",
    "dq": "data_quality",
}

NULLISH = {"", "nan", "n/a", "na", "null", "-", "unknown", "unk"}


def _lower_strip(x: Any) -> str:
    if pd.isna(x) or x is None:
        return ""
    return str(x).strip().lower()


def normalize_status(raw: Any) -> str:
    v = _lower_strip(raw)
    if not v:
        return "unknown"
    return STATUS_MAP.get(v, v)


def normalize_error_type(raw: Any) -> str:
    v = _lower_strip(raw)
    if not v:
        return "none"
    if v in NULLISH:
        return "unknown"
    if v == "none":
        return "none"
    return ERROR_MAP.get(v, v)


def clean_message(raw: Any) -> str:
    if pd.isna(raw) or raw is None:
        return ""
    s = str(raw).strip()
    s = re.sub(r"\s+", " ", s)
    return s[:16000]


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    if "duration" not in out.columns:
        out["duration"] = 0.0
    if "retry_count" not in out.columns:
        out["retry_count"] = 0
    out["duration"] = pd.to_numeric(out["duration"], errors="coerce").fillna(0.0).clip(lower=0.0, upper=1e7)
    out["retry_count"] = pd.to_numeric(out["retry_count"], errors="coerce").fillna(0).astype(int).clip(lower=0, upper=100)
    out["status"] = out.get("status", "").map(normalize_status)
    out["error_type"] = out.get("error_type", "").map(normalize_error_type)
    out["message"] = out.get("message", "").map(clean_message)
    return out


_SUCCESS_MSG = re.compile(
    r"(completed successfully|status=ok|\bpass\b|committed partitions|rows=\d+.*success|"
    r"finished: pass|freshness within sla)",
    re.I,
)
_FAIL_MSG = re.compile(
    r"(timeout|violation|not found|forbidden|403|401|error:|failed|exception)",
    re.I,
)


def derive_binary_label(df: pd.DataFrame, label_col: str | None = "label") -> np.ndarray:
    """Build y in {0,1}. Prefer explicit ``label`` if present."""
    if label_col and label_col in df.columns:
        return pd.to_numeric(df[label_col], errors="coerce").fillna(0).astype(np.int64).clip(0, 1).to_numpy()

    p = prepare_features(df.copy())
    st = p["status"]
    et = p["error_type"]
    msg = p["message"].astype(str)

    strict_success = (st.isin(["success", "ok", "completed"])) & (et == "none")
    ok_hint = msg.apply(lambda s: bool(_SUCCESS_MSG.search(s)) and not _FAIL_MSG.search(s))
    loose_success = (et == "none") & ok_hint & st.isin(["warning", "degraded", "error", "unknown"])
    success = strict_success | loose_success
    y = (~success).astype(np.int64)
    return np.clip(y, 0, 1)
