"""Evaluate trained models + guardrails against CSV / JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix

from ml.inference import predict_etl
from ml.preprocessing_utils import derive_binary_label


def load_models(model_dir: Path) -> tuple:
    b = joblib.load(model_dir / "etl_failure_model.pkl")
    m = joblib.load(model_dir / "etl_failure_type_model.pkl")
    return b, m


def eval_csv(csv_path: Path, model_dir: Path, sample_n: int = 12) -> None:
    df = pd.read_csv(csv_path)
    y_true = derive_binary_label(df).astype(int)

    binary, multiclass = load_models(model_dir)
    preds = []
    probs = []
    types = []

    rows = df.to_dict("records")
    for payload in rows:
        r = predict_etl(binary, multiclass, payload)
        preds.append(0 if r["status"] == "SUCCESS" else 1)
        probs.append(float(r["probability"]))
        types.append(r.get("failure_type") or "")

    pr = np.array(preds)
    print(f"\n=== {csv_path.name} ===")
    print("truth fail rate:", float(y_true.mean()), "pred fail rate:", float(pr.mean()))
    print(classification_report(y_true, pr, digits=4, zero_division=0))
    print("confusion_matrix [TN FP; FN TP]:\n", confusion_matrix(y_true, pr))

    pq = pd.Series(probs)
    print("adj p_fail quantiles [.05,.5,.95]:", float(pq.quantile(0.05)), float(pq.quantile(0.5)), float(pq.quantile(0.95)))

    ft = pd.Series([t for t in types if t])
    if len(ft):
        print("failure_type value_counts:\n", ft.value_counts())

    succ_idx = [i for i, p in enumerate(preds) if p == 0][: max(4, sample_n // 2)]
    fail_idx = [i for i, p in enumerate(preds) if p == 1][: max(4, sample_n // 2)]
    picks = succ_idx[:4] + fail_idx[:4]
    print("\nSample rows (status, et, msg[:80], truth, pred):")
    for i in picks:
        mess = str(rows[i].get("message", ""))[:80]
        print(
            i,
            rows[i].get("status"),
            rows[i].get("error_type"),
            mess,
            "y="
            + str(y_true[i]),
            "pred="
            + str(pr[i]),
        )


def eval_json(path: Path, model_dir: Path) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "samples" in data:
        data = data["samples"]
    binary, multiclass = load_models(model_dir)
    print(f"\n=== {path.name} (inference samples) ===")
    for i, payload in enumerate(data):
        out = predict_etl(binary, multiclass, payload)
        mm = str(payload.get("message", ""))[:70]
        print(
            i,
            "->",
            out["status"],
            f"p_fail={out['probability']:.3f}",
            out.get("failure_type"),
            "|",
            mm,
        )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", type=Path, default=Path(__file__).resolve().parent / "models")
    ap.add_argument("--train_like", type=Path, default=None)
    ap.add_argument("--stress", type=Path, default=None)
    ap.add_argument("--json_samples", type=Path, default=None)
    ns = ap.parse_args()
    base = Path(__file__).resolve().parents[1] / "testData"
    train_like = ns.train_like or (base / "etl_synth_train_like.csv")
    stress = ns.stress or (base / "etl_synth_stress_cases.csv")
    js = ns.json_samples or (base / "etl_synth_inference_samples.json")

    eval_csv(train_like, ns.models)
    if stress.exists():
        eval_csv(stress, ns.models)
    if js.exists():
        eval_json(js, ns.models)


if __name__ == "__main__":
    main()
