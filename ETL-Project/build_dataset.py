import json
import pandas as pd
import re
import os

# STEP 1: Parse DBT logs

def parse_dbt(path):
    with open(path, "r") as f:g
        data = json.load(f)

    rows = []

    for r in data.get("results", []):
        status = r.get("status", "unknown")
        duration = r.get("execution_time", 0)
        message = r.get("message", "")

        row = {
            "duration": duration,
            "retry_count": 0,
            "status": status,
            "error_type": "none" if status == "success" else "dbt_error",
            "message": message,
            "label": 0 if status == "success" else 1
        }
        rows.append(row)

    return pd.DataFrame(rows)


# STEP 2: Classify errors
def classify_error(msg):
    msg = msg.lower()

    if "schema" in msg:
        return "schema_mismatch"
    elif "timeout" in msg:
        return "timeout"
    elif "not found" in msg or "no such file" in msg:
        return "missing_file"
    elif "permission" in msg or "denied" in msg or "unauthorized" in msg:
        return "permission"
    elif "null" in msg or "quality" in msg:
        return "data_quality"
    else:
        return "other"


# STEP 3: Parse airflow logs
def parse_airflow(path):
    rows = []

    with open(path, "r") as f:
        logs = f.readlines()

    for log in logs:
        log_lower = log.lower()

        status = "failed" if "fail" in log_lower or "error" in log_lower else "success"

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

# STEP 4: Load files
dbt_path = "backend/data/raw/run_results.json"
airflow_path = "backend/data/raw/airflow_logs.txt"

df_list = []

if os.path.exists(dbt_path):
    df_dbt = parse_dbt(dbt_path)
    df_list.append(df_dbt)
else:
    print("run_results.json not found")

if os.path.exists(airflow_path):
    df_airflow = parse_airflow(airflow_path)
    df_list.append(df_airflow)
else:
    print("airflow_logs.txt not found")

if len(df_list) == 0:
    print("No input files found. Add files to backend/data/raw/")
    exit()


# STEP 5: Combining the data
df = pd.concat(df_list, ignore_index=True)


# STEP 6: Solving data challenges
df_fail = df[df["label"] == 1]
df_success = df[df["label"] == 0]

if len(df_fail) > 0 and len(df_success) > len(df_fail):
    df_success = df_success.sample(len(df_fail), random_state=42)

df_balanced = pd.concat([df_fail, df_success], ignore_index=True)


# STEP 7: Saving dataset into csv format
output_path = "backend/data/processed/etl_dataset.csv"
df_balanced.to_csv(output_path, index=False)

print("Dataset created successfully!")
print(df_balanced.head())
print(f"Saved to: {output_path}")