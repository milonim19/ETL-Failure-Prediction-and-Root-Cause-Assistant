import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RunSummary, ShapValue } from '../types';
import { getRuns } from '../services/api';

type RootCauseCount = { failure_type: string; count: number };
const RUNS_CACHE_KEY = 'etl_runs_cache_v1';

const readCachedRuns = (): RunSummary[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RUNS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RunSummary[]) : [];
  } catch {
    return [];
  }
};

const writeCachedRuns = (runs: RunSummary[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RUNS_CACHE_KEY, JSON.stringify(runs));
  } catch {
    // Ignore storage write failures.
  }
};

const normalizeFailureType = (value: unknown) => {
  if (typeof value !== 'string' || value.trim().length === 0) return 'unknown';
  return value.trim();
};

const pickTopShapDrivers = (shap?: ShapValue[], limit = 5) => {
  if (!Array.isArray(shap) || shap.length === 0) return [];
  const sorted = [...shap].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  return sorted.slice(0, limit);
};

const computeRootCauseCounts = (runs: RunSummary[], topN = 4): RootCauseCount[] => {
  const failures = runs.filter((r) => r.status === 'FAIL');
  if (failures.length === 0) return [];

  const counts = new Map<string, number>();
  for (const r of failures) {
    const key = normalizeFailureType(r.failure_type);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const sorted = [...counts.entries()]
    .map(([failure_type, count]) => ({ failure_type, count }))
    .sort((a, b) => b.count - a.count);

  if (sorted.length <= topN) return sorted;

  const head = sorted.slice(0, topN);
  const tail = sorted.slice(topN);
  const otherCount = tail.reduce((sum, x) => sum + x.count, 0);
  return [...head, { failure_type: 'other', count: otherCount }];
};

export function useRuns(limit = 50) {
  const [runs, setRuns] = useState<RunSummary[]>(() => readCachedRuns());
  const [loading, setLoading] = useState(() => readCachedRuns().length === 0);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(runs.length === 0);
    setError(null);
    try {
      const next = await getRuns(limit);
      const sorted = [...next].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
      setRuns(sorted);
      writeCachedRuns(sorted);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load run history';
      setError(message);
      // Keep last-known runs on screen so home does not flash empty content.
      setRuns((prev) => prev);
    } finally {
      setLoading(false);
    }
  }, [limit, runs.length]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const latestRun = runs[0] ?? null;

  const rootCauseCounts = useMemo(() => computeRootCauseCounts(runs), [runs]);
  const topShapDrivers = useMemo(
    () => pickTopShapDrivers(latestRun?.shap_values),
    [latestRun?.shap_values],
  );

  return {
    runs,
    latestRun,
    rootCauseCounts,
    topShapDrivers,
    loading,
    error,
    refresh,
  };
}

