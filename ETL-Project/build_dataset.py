# Date: 3/25/25
# Author: Miloni Mehta
# Description: Script to read raw ETL logs (dbt and Airflow), clean and extract useful features,
# and convert them into a structured CSV dataset for model training.

import json
import pandas as pd
import re
import os
import random


# ----------------------------
# CONFIG (edit these if needed)
# ----------------------------
RAW_DIR = "backend/data/raw"
OUT_PATH = "backend/data/processed/etl_dataset.csv"

# If your dataset is still small, increase these numbers.
GENERATE_SYNTHETIC = True
SYNTHETIC_AIRFLOW_SAMPLES = 250
SYNTHETIC_DBT_SAMPLES = 250

random.seed(42)


# STEP 1: Parse DBT logs
def parse_dbt(path):
    # FIXED BUG: removed typo "as f:g"
    with open(path, "r") as f:
        data = json.load(f)

    rows = []

    for r in data.get("results", []):
        status = r.get("status", "unknown")
        duration = r.get("execution_time", 0)
        message = r.get("message", "")

        row = {
            "duration": float(duration) if duration is not None else 0,
            "retry_count": 0,
            "status": status.lower().strip(),
            "error_type": "none" if status == "success" else "dbt_error",
            "message": message,
            "label": 0 if status == "success" else 1
        }
        rows.append(row)

    return pd.DataFrame(rows)


# STEP 2: Classify errors
def classify_error(msg):
    msg = msg.lower()

    if "schema" in msg or "type mismatch" in msg or "column" in msg:
        return "schema_mismatch"
    elif "timeout" in msg or "timed out" in msg or "deadline" in msg:
        return "timeout"
    elif "not found" in msg or "no such file" in msg or "missing file" in msg or "path" in msg:
        return "missing_file"
    elif "permission" in msg or "denied" in msg or "unauthorized" in msg or "forbidden" in msg:
        return "permission"
    elif "null" in msg or "quality" in msg or "constraint" in msg:
        return "data_quality"
    else:
        return "other"


# STEP 3: Parse Airflow logs
def parse_airflow(path):
    rows = []

    with open(path, "r") as f:
        logs = f.readlines()

    for log in logs:
        log_lower = log.lower()

        status = "failed" if ("fail" in log_lower or "error" in log_lower) else "success"

        retry_match = re.search(r'(\d+)\s+retries', log_lower)
        duration_match = re.search(r'(\d+)\s+seconds', log_lower)

        retry_count = int(retry_match.group(1)) if retry_match else 0
        duration = int(duration_match.group(1)) if duration_match else 0

        error_type = classify_error(log) if status == "failed" else "none"

        row = {
            "duration": duration,
            "retry_count": retry_count,
            "status": status,
            "error_type": error_type,
            "message": log.strip(),
            "label": 1 if status == "failed" else 0
        }
        rows.append(row)

    return pd.DataFrame(rows)


# -------------------------------------------------------
# EXTRA: Synthetic dataset expansion (failure injection)
# -------------------------------------------------------
def generate_synthetic_airflow(n=200):
    templates = [
        ("success", "Task completed successfully in {dur} seconds after {ret} retries"),
        ("schema_mismatch", "Task failed due to schema mismatch in {dur} seconds after {ret} retries"),
        ("missing_file", "Task error: file not found in {dur} seconds after {ret} retries"),
        ("timeout", "Task failed due to timeout in {dur} seconds after {ret} retries"),
        ("permission", "Task failed because permission denied in {dur} seconds after {ret} retries"),
        ("data_quality", "Task failed due to data quality check: null values found in {dur} seconds after {ret} retries"),
    ]

    rows = []
    for _ in range(n):
        kind, tmpl = random.choice(templates)

        if kind == "success":
            dur = random.randint(8, 35)
            ret = random.choice([0, 0, 0, 1])
            status = "success"
            error_type = "none"
            label = 0
        else:
            dur = random.randint(15, 120)
            ret = random.choice([1, 2, 3, 4])
            status = "failed"
            error_type = kind
            label = 1

        msg = tmpl.format(dur=dur, ret=ret)

        rows.append({
            "duration": dur,
            "retry_count": ret,
            "status": status,
            "error_type": error_type,
            "message": msg,
            "label": label
        })

    return pd.DataFrame(rows)


def generate_synthetic_dbt(n=200):
    messages = {
        "success": [
            "Model completed successfully",
            "Run completed",
            "Transformation step finished",
            "Loaded table successfully"
        ],
        "schema_mismatch": [
            "Schema mismatch detected in transformed table",
            "Column type mismatch while casting fields",
            "Schema drift: missing expected column"
        ],
        "timeout": [
            "Timeout while loading data into warehouse",
            "Timed out waiting for query execution"
        ],
        "missing_file": [
            "Source file not found in staging path",
            "No such file or directory during extract"
        ],
        "permission": [
            "Permission denied while writing to warehouse",
            "Unauthorized access to dataset"
        ],
        "data_quality": [
            "Data quality check failed: null constraint violated",
            "Quality rule failed: duplicate primary key detected"
        ]
    }

    kinds = ["success", "schema_mismatch", "timeout", "missing_file", "permission", "data_quality"]
    rows = []

    for _ in range(n):
        kind = random.choice(kinds)

        if kind == "success":
            status = "success"
            label = 0
            duration = round(random.uniform(5.0, 20.0), 2)
            err_type = "none"
        else:
            status = "error"
            label = 1
            duration = round(random.uniform(15.0, 90.0), 2)
            err_type = "dbt_error"

        msg = random.choice(messages[kind])

        rows.append({
            "duration": duration,
            "retry_count": 0,
            "status": status,
            "error_type": err_type if label == 1 else "none",
            "message": msg,
            "label": label
        })

    return pd.DataFrame(rows)


# STEP 4: Load files (supports multiple raw files)
def load_all_inputs(raw_dir):
    df_list = []

    if not os.path.exists(raw_dir):
        print(f"Raw directory not found: {raw_dir}")
        return df_list

    files = os.listdir(raw_dir)

    # load all run_results*.json
    for filename in files:
        if filename.startswith("run_results") and filename.endswith(".json"):
            path = os.path.join(raw_dir, filename)
            df_list.append(parse_dbt(path))

    # load all airflow_logs*.txt
    for filename in files:
        if filename.startswith("airflow_logs") and filename.endswith(".txt"):
            path = os.path.join(raw_dir, filename)
            df_list.append(parse_airflow(path))

    return df_list


# -------------------
# MAIN SCRIPT
# -------------------
df_list = load_all_inputs(RAW_DIR)

# If nothing found, exit
if len(df_list) == 0:
    print("No input files found. Add files to backend/data/raw/")
    exit()

# STEP 5: Combine raw sources
df = pd.concat(df_list, ignore_index=True)

# Optional: synthetic expansion (adds more rows)
if GENERATE_SYNTHETIC:
    df = pd.concat(
        [df, generate_synthetic_airflow(SYNTHETIC_AIRFLOW_SAMPLES), generate_synthetic_dbt(SYNTHETIC_DBT_SAMPLES)],
        ignore_index=True
    )

# STEP 6: DO NOT DOWNSAMPLE (keep all rows)
df_final = df.copy()

# STEP 7: Save dataset
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
df_final.to_csv(OUT_PATH, index=False)

print("Dataset created successfully!")
print(df_final.head())
print(f"Total rows: {len(df_final)}")
print(f"Saved to: {OUT_PATH}")