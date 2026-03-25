import React from 'react';
import { Clock, RotateCcw, TriangleAlert, CheckCircle2 } from 'lucide-react';
import type { RunSummary } from '../types';

type Props = {
  run: RunSummary | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const formatTimestamp = (iso: string) => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString();
};

const formatDuration = (seconds?: number) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${seconds.toFixed(0)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
};

export default function LatestRunCard({ run, loading, error, onRetry }: Props) {
  const status = run?.status ?? null;
  const isFail = status === 'FAIL';
  const isSuccess = status === 'SUCCESS';

  return (
    <div className="card-base">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Latest Run</p>
          <h3 className="text-lg font-semibold text-zinc-900 mt-1">Most recent pipeline outcome</h3>
        </div>
        {status ? (
          <span
            className={[
              'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border',
              isFail
                ? 'bg-red-50 text-red-700 border-red-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-100',
            ].join(' ')}
          >
            {status}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
          <div className="h-16 bg-zinc-100 rounded-xl animate-pulse" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <TriangleAlert className="w-5 h-5 text-zinc-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-900">History unavailable</p>
              <p className="text-xs text-zinc-500 mt-1">{error}</p>
              {onRetry ? (
                <button
                  type="button"
                  className="mt-3 inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50"
                  onClick={onRetry}
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : !run ? (
        <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50">
          <p className="text-sm font-semibold text-zinc-900">No runs yet</p>
          <p className="text-xs text-zinc-500 mt-1">Run an analysis to populate live history.</p>
        </div>
      ) : (
        <>
          <div className="p-4 rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center gap-3">
              <div
                className={[
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  isFail ? 'bg-red-50' : 'bg-emerald-50',
                ].join(' ')}
              >
                {isFail ? (
                  <TriangleAlert className="w-5 h-5 text-red-700" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-zinc-500 font-medium">Summary</p>
                <p className="text-sm font-semibold text-zinc-900 truncate">
                  {run.status}
                  {run.failure_type ? ` · ${run.failure_type}` : ''}
                  {run.message ? ` · ${run.message}` : ''}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Run ID</p>
                <p className="text-xs font-semibold text-zinc-900">{run.id}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Timestamp</p>
              <p className="text-xs font-semibold text-zinc-900 mt-1">{formatTimestamp(run.timestamp)}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Duration</p>
              </div>
              <p className="text-xs font-semibold text-zinc-900 mt-1">
                {formatDuration(run.metrics?.duration as number | undefined)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Retries</p>
              <p className="text-xs font-semibold text-zinc-900 mt-1">
                {typeof run.metrics?.retries === 'number' ? run.metrics.retries : '—'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

