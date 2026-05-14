from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PredictRequest(BaseModel):
    duration: float = Field(..., description="Run duration in seconds")
    retry_count: int = Field(..., ge=0, description="Retry attempts for the ETL run")
    status: str = Field(..., min_length=1, description="Current run status text")
    error_type: str = Field(..., min_length=1, description="Error category text")
    message: Optional[str] = Field(default=None, description="Optional run log message")
    explain_shap: bool = Field(
        default=False,
        description="If true, return grouped SHAP values for binary failure probability (adds latency).",
    )

    model_config = ConfigDict(extra="allow")

    def to_feature_dict(self) -> Dict[str, object]:
        payload = self.model_dump()
        payload["retry_count"] = int(payload["retry_count"])
        payload["duration"] = float(payload["duration"])
        payload["explain_shap"] = bool(payload.get("explain_shap", False))
        return payload


class ShapValue(BaseModel):
    feature: str
    impact: float


class PredictionResponse(BaseModel):
    id: str
    timestamp: datetime
    probability: float
    status: Literal["FAIL", "SUCCESS"]
    failure_type: Optional[str] = None
    shap_values: Optional[List[ShapValue]] = None
    metrics: Dict[str, object] = Field(default_factory=dict)
    message: Optional[str] = None
    model: str = "combined_v1"


class RunsResponse(BaseModel):
    runs: List[PredictionResponse]


class BatchPredictRequest(BaseModel):
    runs: List[PredictRequest]

    @field_validator("runs")
    @classmethod
    def validate_batch_size(cls, value: List[PredictRequest]) -> List[PredictRequest]:
        if len(value) == 0:
            raise ValueError("Batch must include at least one run")
        if len(value) > 5000:
            raise ValueError("Batch size cannot exceed 5000 runs")
        return value


class BatchPredictionSummaryResponse(BaseModel):
    total: int
    success_count: int
    failure_count: int
    success_ratio: float
    failure_ratio: float
    average_failure_probability: float
    average_probability_all_rows: float = Field(
        ...,
        description="Mean displayed P(failure) across every row in the batch.",
    )
    average_duration: float = Field(..., description="Mean duration (seconds) from input rows.")
    average_retry_count: float = Field(..., description="Mean retry_count from input rows.")
    top_failure_type: Optional[str] = Field(
        default=None,
        description="Most frequent predicted root cause among failed rows, if any.",
    )
    failure_type_counts: Dict[str, int] = Field(default_factory=dict)
