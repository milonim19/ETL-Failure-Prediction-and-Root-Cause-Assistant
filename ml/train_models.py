"""Train models: python -m ml.train_models --csv testData/etl_synth_train_like.csv --out ml/models"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ml.preprocessing_utils import derive_binary_label, prepare_features


def sniff_rc(r: pd.Series) -> str:
    e = str(r.get("error_type", "")).lower().strip()
    if e and e not in {"none", "unknown"}:
        return e
    m = str(r.get("message", "")).lower()
    hits = [
        ("schema mismatch", "schema_mismatch"),
        ("file not found", "missing_file"),
        ("not found s3", "missing_file"),
        ("permission", "permission"),
        ("403", "permission"),
        ("401", "permission"),
        ("timed out", "timeout"),
        ("timeout", "timeout"),
        ("heartbeat lost", "timeout"),
        ("execution_timeout", "timeout"),
        ("dq rule", "data_quality"),
        ("negative amount", "data_quality"),
        ("checkpoint failed", "data_quality"),
        ("upstream", "upstream_dependency"),
        ("watermark", "upstream_dependency"),
    ]
    for q, lab in hits:
        if q in m:
            return lab
    return "unknown"


def coltx() -> ColumnTransformer:
    return ColumnTransformer(
        [
            ("num", StandardScaler(), ["duration", "retry_count"]),
            ("cat", OneHotEncoder(handle_unknown="ignore", max_categories=48), ["status", "error_type"]),
            (
                "msg",
                TfidfVectorizer(max_features=3000, min_df=2, ngram_range=(1, 2), sublinear_tf=True),
                "message",
            ),
        ],
        sparse_threshold=0.35,
    )


def coltx_small() -> ColumnTransformer:
    """Multiclass on small failure subsets: allow rare terms."""
    return ColumnTransformer(
        [
            ("num", StandardScaler(), ["duration", "retry_count"]),
            ("cat", OneHotEncoder(handle_unknown="ignore", max_categories=48), ["status", "error_type"]),
            (
                "msg",
                TfidfVectorizer(max_features=4000, min_df=1, ngram_range=(1, 2), sublinear_tf=True),
                "message",
            ),
        ],
        sparse_threshold=0.35,
    )


def pipe_bin() -> CalibratedClassifierCV:
    """Binary head: LogisticRegression pipeline wrapped in CalibratedClassifierCV (sigmoid / Platt)."""
    p = Pipeline(
        [
            ("p", coltx()),
            (
                "lr",
                LogisticRegression(
                    class_weight="balanced",
                    solver="saga",
                    max_iter=8000,
                    n_jobs=1,
                    C=0.22,
                ),
            ),
        ]
    )
    return CalibratedClassifierCV(p, cv=3, method="sigmoid", n_jobs=1)


def pipe_mc_multinomial() -> Pipeline:
    return Pipeline(
        [
            ("p", coltx_small()),
            (
                "lr",
                LogisticRegression(
                    class_weight="balanced",
                    solver="saga",
                    max_iter=15000,
                    n_jobs=1,
                    C=0.38,
                ),
            ),
        ]
    )


def fit_multiclass(fz2: pd.DataFrame, y2: pd.Series) -> Pipeline | CalibratedClassifierCV:
    """Calibrate when enough rows per class; otherwise plain multinomial LR."""
    base = pipe_mc_multinomial()
    counts = y2.value_counts()
    min_c = int(counts.min())
    n = len(y2)
    if min_c < 2 or n < 8:
        base.fit(fz2, y2)
        return base
    cv = min(4, min_c, max(2, n // 3))
    cal = CalibratedClassifierCV(base, cv=cv, method="sigmoid", n_jobs=1)
    cal.fit(fz2, y2)
    return cal


def train(csv_p: Path, out: Path) -> None:
    df0 = pd.read_csv(csv_p)
    X = prepare_features(df0)
    y = derive_binary_label(df0)
    uniq = np.unique(y)
    strat = y if len(uniq) > 1 else None
    tr_x, te_x, tr_y, te_y = train_test_split(X, y, test_size=0.2, stratify=strat, random_state=42)

    b = pipe_bin()
    b.fit(tr_x, tr_y)
    bin_pred = b.predict(te_x)
    pb = b.predict_proba(te_x)[:, 1]

    print("=== BINARY validation ===")
    print("truth fail rate:", float(te_y.mean()), "pred fail rate:", float(bin_pred.mean()))
    print(classification_report(te_y, bin_pred, digits=4))
    print("confusion_matrix [TN FP; FN TP]:", confusion_matrix(te_y, bin_pred))
    print("p_fail min/mean/max:", float(pb.min()), float(pb.mean()), float(pb.max()))

    out.mkdir(parents=True, exist_ok=True)
    joblib.dump(b, out / "etl_failure_model.pkl")

    sub = tr_y.astype(bool)
    fz = tr_x.loc[sub].reset_index(drop=True)
    lbl = fz.apply(sniff_rc, axis=1)
    vc = lbl.value_counts()
    keep = vc[vc >= 2].index
    if len(keep) == 0:
        print("Skip multiclass — not enough labels")
        meta = {
            "binary_val_fail_rate_truth": float(te_y.mean()),
            "binary_val_fail_rate_pred": float(bin_pred.mean()),
            "multiclass_skipped": True,
        }
        (out / "training_meta.json").write_text(json.dumps(meta, indent=2))
        return

    fz2 = fz[lbl.isin(keep)].reset_index(drop=True)
    y2 = lbl[lbl.isin(keep)].reset_index(drop=True)

    mdl = fit_multiclass(fz2, y2)
    joblib.dump(mdl, out / "etl_failure_type_model.pkl")

    te_f = te_y.astype(bool)
    if te_f.sum() > 0:
        te_fail = te_x.loc[te_f]
        pm = mdl.predict(te_fail)
        print("=== MULTICLASS validation (failure rows) ===")
        print(pd.Series(pm).value_counts().to_string())

    meta = {
        "binary_val_fail_rate_truth": float(te_y.mean()),
        "binary_val_fail_rate_pred": float(bin_pred.mean()),
        "multiclass_keep": keep.tolist(),
    }
    (out / "training_meta.json").write_text(json.dumps(meta, indent=2))


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", type=Path, required=True)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent / "models")
    return ap.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train(args.csv, args.out)
