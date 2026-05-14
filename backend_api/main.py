from __future__ import annotations

import os
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from .model_service import ModelService
from .run_store import RunStore
from .schemas import (
    BatchPredictionSummaryResponse,
    BatchPredictRequest,
    PredictRequest,
    PredictionResponse,
    RunsResponse,
    ShapValue as ShapOut,
)

app = FastAPI(title="ETL Failure Prediction API", version="1.0.0")
model_service = ModelService()
run_store = RunStore()


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictRequest) -> PredictionResponse:
    result = model_service.predict(payload.to_feature_dict())
    raw_shap = result.get("shap_values")
    shap_models: list[ShapOut] | None = None
    if isinstance(raw_shap, list) and len(raw_shap) > 0:
        shap_models = [
            ShapOut(feature=str(s.get("feature", "")), impact=float(s.get("impact", 0.0)))
            for s in raw_shap
            if isinstance(s, dict)
        ]
        if not shap_models:
            shap_models = None
    run = PredictionResponse(
        id=f"run_{uuid4().hex[:8]}",
        timestamp=datetime.now(timezone.utc),
        probability=result["probability"],
        status=result["status"],
        failure_type=result["failure_type"],
        metrics=result["metrics"],
        message=result["message"],
        shap_values=shap_models,
    )
    run_store.add(run)
    return run


@app.post("/predict/batch", response_model=BatchPredictionSummaryResponse)
def predict_batch(payload: BatchPredictRequest) -> BatchPredictionSummaryResponse:
    success_count = 0
    failure_count = 0
    probability_sum_failure = 0.0
    probability_sum_all = 0.0
    duration_sum = 0.0
    retry_sum = 0.0
    failure_types: dict[str, int] = {}

    for row in payload.runs:
        fd = row.to_feature_dict()
        duration_sum += float(fd["duration"])
        retry_sum += float(fd["retry_count"])
        result = model_service.predict(fd)
        p = float(result["probability"])
        probability_sum_all += p
        status = result["status"]
        if status == "SUCCESS":
            success_count += 1
        else:
            failure_count += 1
            probability_sum_failure += p
            ft = result.get("failure_type")
            if isinstance(ft, str) and ft.strip():
                failure_types[ft] = failure_types.get(ft, 0) + 1

    total = success_count + failure_count
    success_ratio = success_count / total if total else 0.0
    failure_ratio = failure_count / total if total else 0.0
    avg_failure_prob = probability_sum_failure / failure_count if failure_count else 0.0
    avg_prob_all = probability_sum_all / total if total else 0.0
    avg_duration = duration_sum / total if total else 0.0
    avg_retry = retry_sum / total if total else 0.0

    top_failure_type: str | None = None
    if failure_types:
        top_failure_type = max(failure_types.items(), key=lambda x: x[1])[0]

    summary = BatchPredictionSummaryResponse(
        total=total,
        success_count=success_count,
        failure_count=failure_count,
        success_ratio=success_ratio,
        failure_ratio=failure_ratio,
        average_failure_probability=avg_failure_prob,
        average_probability_all_rows=avg_prob_all,
        average_duration=avg_duration,
        average_retry_count=avg_retry,
        top_failure_type=top_failure_type,
        failure_type_counts=failure_types,
    )

    # One synthetic History entry per batch file so GET /runs (Home latest, etc.)
    batch_status = "FAIL" if failure_count > success_count else "SUCCESS"
    batch_ft = top_failure_type if failure_count > 0 else None
    batch_metrics: dict[str, object] = {
        "duration": avg_duration,
        "retries": avg_retry,
        "rows": total,
        "kind": "batch_file",
        "batch_success_count": success_count,
        "batch_failure_count": failure_count,
        "average_failure_probability_rows": avg_failure_prob,
    }
    synth = PredictionResponse(
        id=f"batch_{uuid4().hex[:10]}",
        timestamp=datetime.now(timezone.utc),
        probability=float(avg_prob_all),
        status=batch_status,
        failure_type=batch_ft,
        metrics=batch_metrics,
        message=f"Batch: {total} rows ({success_count} success, {failure_count} fail)",
        shap_values=None,
        model="batch_summary_v1",
    )
    run_store.add(synth)
    return summary


@app.get("/runs", response_model=RunsResponse)
def runs(limit: int = Query(default=50, ge=1, le=500)) -> RunsResponse:
    return RunsResponse(runs=run_store.list(limit))
