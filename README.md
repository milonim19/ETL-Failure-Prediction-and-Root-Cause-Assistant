# ETL Failure Prediction & Root-Cause Assistant (PipeGuard AI)
A course project for Applied Machine Learning at Stevens Institute of Technology.
**By:** Miloni Mehta · Atharv Prashant Andhare · Salvatore Scotto Di Vetta

This project builds an ML-powered assistant that analyzes ETL run telemetry + logs to:
1) **Predict failure risk** (Fail vs Success), and  
2) **Suggest the most likely root-cause category** when risk is elevated (schema mismatch, missing file, timeout/resource, permission/auth, data quality).

The goal is to help teams catch pipeline issues earlier and reduce time spent manually debugging logs.

---

## Project Overview

**Inputs**
- Run telemetry (e.g., duration, retries, row counts)
- Log/error text (messages from orchestration tools)

**Outputs**
- **Model 1 (Binary):** failure probability (risk score) + predicted label (pass/fail)
- **Model 2 (Multi-class):** predicted failure category (root-cause)
- Optional explanation: top contributing signals using **SHAP / feature importance**

---

## Data Sources & Dataset

To make the dataset reproducible, we generate a structured CSV from:
- **Airflow-style logs** (`backend/data/raw/airflow_logs*.txt`)
- **dbt run results** (`backend/data/raw/run_results*.json`)
- Optional: synthetic run generation / controlled failure injection (to expand dataset for training)

The dataset is written to:
- `backend/data/processed/etl_dataset.csv`

**Note:** ETL failure data is usually imbalanced (more successes than failures). We keep all rows and handle imbalance during modeling (e.g., class weights / threshold tuning) rather than deleting data.

---

## Tech Stack

**Modeling**
- Python
- scikit-learn (baseline + tuned models)
- SHAP (explainability)

**App / UI**
- Streamlit (simple interactive demo for uploads + predictions)
- The repo also includes a frontend scaffold (Vite + TypeScript + Tailwind) if you want a more custom UI.

---

## Repository Structure (high level)

- `backend/data/raw/`  
  Raw log inputs (Airflow-style txt + dbt json)
- `backend/data/processed/`  
  Generated dataset CSV used for training/evaluation
- `build_dataset.py`  
  Builds/updates `etl_dataset.csv` from raw inputs (and optional synthetic samples)
- `ml/` or `src/`  
  Model training, evaluation, and app code (varies by branch/folder organization)

---

## Getting Started

### 1) Clone the repository
```bash
git clone https://github.com/milonim19/ETL-Failure-Prediction-and-Root-Cause-Assistant.git
cd ETL-Failure-Prediction-and-Root-Cause-Assistant
