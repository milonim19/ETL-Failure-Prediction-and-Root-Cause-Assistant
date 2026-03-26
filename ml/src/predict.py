import joblib
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "etl_failure_model.pkl"

def predict_one():
    model = joblib.load(MODEL_PATH)
    sample = pd.DataFrame([{
        "duration": 12.5,
        "retry_count": 1,
        "status": "warning",
        "error_type": "timeout"
    }])
    pred = model.predict(sample)[0]
    prob = model.predict_proba(sample)[0, 1]
    print({"prediction": int(pred), "failure_probability": float(prob)})

if __name__ == "__main__":
    predict_one()
