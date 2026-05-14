# ETL Failure Prediction & Root-Cause Assistant (PipeGuard AI)
A course project for Applied Machine Learning at Stevens Institute of Technology.

By: Miloni Mehta · Atharv Prashant Andhare · Salvatore Scotto Di Vetta

This project builds an ML-powered assistant that analyzes ETL run telemetry + logs to:
1) **Predict failure risk** (Fail vs Success)
2) **Suggest the most likely root-cause category** when risk is elevated (schema mismatch, missing file, timeout/resource, permission/auth, data quality).
For Model 1, we use SHAP to break the failure risk score into feature-level contributions. This helps us see what drove a high-risk prediction (e.g., unusually long runtime, high retry count, or specific log signals) so we can start debugging in the right place.

The goal is to help teams catch pipeline issues earlier and reduce time spent manually debugging logs.

---------------------------

## Project Overview

**Inputs**
- Run telemetry (e.g., duration, retries, row counts)
- Log/error text (messages from orchestration tools)


**Outputs**
- **Model 1 (Binary):** failure probability (risk score) + predicted label (pass/fail)
- **Model 2 (Multi-class):** predicted failure category (root-cause)

---------------------------

## Data Sources & Dataset

To make the dataset reproducible, we generate a structured CSV from:
- Airflow-style logs (`backend/data/raw/airflow_logs*.txt`)
- dbt run results (`backend/data/raw/run_results*.json`)
- Synthetic data run generation / controlled failure injection (expand dataset to improve the training of the models)

The dataset is written to:
- `backend/data/processed/etl_dataset.csv`

**Note:** ETL failure data is usually imbalanced (more successes than failures). We keep all rows and handle imbalance during modeling (e.g., class weights / threshold tuning) rather than deleting data.


---------------------------
## Tech Stack

**Modeling approach:**
-Built a two-stage scikit-learn setup where Model 1 predicts fail vs success (risk score), and Model 2 predicts the most likely failure category when risk is high.
-Explainability: Model 1 is SHAP-compatible and we surface the top contributing signals behind each high-risk prediction (e.g., runtime, retries, and error keywords) so results are interpretable for debugging.
- Python
- scikit-learn (baseline + tuned models)

**App / UI**
- Streamlit (simple interactive demo for uploads + predictions)
- The repo also includes a frontend scaffold (Vite + TypeScript + Tailwind) if you want a more custom UI.


---------------------------

## Repository Structure (high level)

- `backend/data/raw/`  
  Raw log inputs (Airflow-style txt + dbt json)
- `backend/data/processed/`  
  Generated dataset CSV used for training/evaluation
- `build_dataset.py`  
  Builds/updates `etl_dataset.csv` from raw inputs (and optional synthetic samples)
- `ml/` or `src/`  
  Model training, evaluation, and app code (varies by branch/folder organization)


---------------------------
## Getting Started

### 1) Clone the repository
```bash
git clone https://github.com/milonim19/ETL-Failure-Prediction-and-Root-Cause-Assistant.git
cd ETL-Failure-Prediction-and-Root-Cause-Assistant
