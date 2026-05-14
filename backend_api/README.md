# FastAPI Backend

This backend serves ETL failure predictions to the React frontend.

## Endpoints

- `GET /health`
- `POST /predict`
- `POST /predict/batch` (body: `{ "runs": [ { ... PredictRequest ... }, ... ] }`, max 5000 rows; returns aggregated counts/ratios, does not append each row to `/runs`)
- `GET /runs?limit=50`

## Setup

1. Create and activate a Python virtual environment.
2. Install dependencies:
   - `pip install -r backend_api/requirements.txt`
3. Ensure model files exist in `ml/models`:
   - `etl_failure_model.pkl`
   - `etl_failure_type_model.pkl`
4. Optionally configure env vars:
   - `MODEL_DIR` (default: `ml/models`)
   - `CORS_ORIGINS` (default: `http://localhost:3000`)
5. Start the API:
   - `uvicorn backend_api.main:app --reload --host 0.0.0.0 --port 8000`
