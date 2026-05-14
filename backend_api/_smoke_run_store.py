"""Quick smoke test for run_store persistence. Run: python -m backend_api._smoke_run_store"""

from datetime import datetime, timezone

from backend_api.run_store import DEFAULT_CACHE_FILE, RunStore
from backend_api.schemas import PredictionResponse


def main() -> None:
    print("Cache file path:", DEFAULT_CACHE_FILE)

    if DEFAULT_CACHE_FILE.exists():
        DEFAULT_CACHE_FILE.unlink()
    print("[1] cache removed ->", not DEFAULT_CACHE_FILE.exists())

    rs1 = RunStore()
    print("[2] cold-start list size:", len(rs1.list(50)))

    single = PredictionResponse(
        id="run_demo01",
        timestamp=datetime.now(timezone.utc),
        probability=0.71,
        status="FAIL",
        failure_type="timeout",
        metrics={"duration": 45.0, "retries": 2},
        message="Single predict demo",
    )
    rs1.add(single)

    batch = PredictionResponse(
        id="batch_demo02",
        timestamp=datetime.now(timezone.utc),
        probability=0.33,
        status="SUCCESS",
        failure_type=None,
        metrics={
            "duration": 12.5,
            "retries": 0,
            "rows": 100,
            "kind": "batch_file",
            "batch_success_count": 90,
            "batch_failure_count": 10,
        },
        message="Batch: 100 rows (90 success, 10 fail)",
        model="batch_summary_v1",
    )
    rs1.add(batch)

    print("[3] in-memory size after 2 adds:", len(rs1.list(50)))
    print("[3] cache file exists on disk:", DEFAULT_CACHE_FILE.exists())

    rs2 = RunStore()
    items = rs2.list(50)
    print("[4] reloaded after simulated restart:", len(items))
    for r in items:
        print("    -", r.id, "|", r.status, "|", r.failure_type, "|", r.message)

    if items:
        latest = items[0]
        print("[5] latest run Home would render:", latest.id, "model =", latest.model)


if __name__ == "__main__":
    main()
