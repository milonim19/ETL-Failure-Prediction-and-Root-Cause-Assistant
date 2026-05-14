from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Dict, Optional

import joblib

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd

from ml.inference import predict_etl
from ml.preprocessing_utils import prepare_features
from ml.shap_etl import build_default_background_frame, compute_binary_shap_for_row


class ModelService:
    def __init__(self) -> None:
        base_dir = Path(__file__).resolve().parents[1]
        model_dir = Path(
            os.getenv("MODEL_DIR", str(base_dir / "ml" / "models"))
        ).resolve()

        self.binary_model_path = model_dir / "etl_failure_model.pkl"
        self.multi_model_path = model_dir / "etl_failure_type_model.pkl"

        self.binary_model = joblib.load(self.binary_model_path)
        self.multi_model = joblib.load(self.multi_model_path)
        self._shap_background: pd.DataFrame = build_default_background_frame()

    def predict(self, payload: Dict[str, object]) -> Dict[str, object]:
        pl = dict(payload)
        explain_shap = bool(pl.pop("explain_shap", False))
        out = predict_etl(self.binary_model, self.multi_model, pl)
        result: Dict[str, object] = {
            "probability": out["probability"],
            "status": out["status"],
            "failure_type": out["failure_type"],
            "metrics": out["metrics"],
            "message": out["message"],
        }
        if explain_shap:
            row = prepare_features(pd.DataFrame([pl]))
            result["shap_values"] = compute_binary_shap_for_row(
                self.binary_model, row, self._shap_background
            )
        return result
