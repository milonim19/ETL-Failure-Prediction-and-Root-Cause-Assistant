import pandas as pd
import joblib
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "etl_dataset.csv"
MODEL_PATH = ROOT / "models" / "etl_failure_type_model.pkl"


def main():
    df = pd.read_csv(DATA_PATH)

    # If failure_type does not exist, use error_type only as the LABEL,
    # not as an input feature.
    if "failure_type" not in df.columns:
        df["failure_type"] = df["error_type"]

    # Model 2 only trains on failed runs
    df = df[df["label"] == 1].copy()

    print("Failure type counts:")
    print(df["failure_type"].value_counts())

    X = df[["duration", "retry_count"]]
    y = df["failure_type"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), ["duration", "retry_count"]),
        ]
    )

    model = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced"))
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)

    print("\n=== MODEL 2 PERFORMANCE ===\n")
    print(classification_report(y_test, y_pred, zero_division=0))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)

    print(f"Saved Model 2 to: {MODEL_PATH}")


if __name__ == "__main__":
    main()
