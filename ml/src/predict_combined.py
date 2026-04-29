import joblib
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

MODEL_1_PATH = ROOT / "models" / "etl_failure_model.pkl"
MODEL_2_PATH = ROOT / "models" / "etl_failure_type_model.pkl"

model_1 = joblib.load(MODEL_1_PATH)
model_2 = joblib.load(MODEL_2_PATH)


def predict_etl_run(input_data):
    """
    Runs Model 1 first.
    If failure is predicted, runs Model 2 to predict root cause.
    """

    df = pd.DataFrame([input_data])

    # Model 1: fail vs success
    failure_prediction = model_1.predict(df)[0]
    failure_probability = model_1.predict_proba(df)[0, 1]

    result = {
        "failure_prediction": int(failure_prediction),
        "failure_probability": float(failure_probability),
        "status": "failure" if failure_prediction == 1 else "success",
        "predicted_root_cause": None
    }

    # Model 2 only runs if Model 1 predicts failure
    if failure_prediction == 1:
        root_cause = model_2.predict(df)[0]
        result["predicted_root_cause"] = root_cause

    return result


if __name__ == "__main__":
    sample_run = {
        "duration": 120,
        "retry_count": 3,
        "status": "failed",
        "error_type": "timeout"
    }

    prediction = predict_etl_run(sample_run)
    print(prediction)
