import React from 'react';
import { Layers } from 'lucide-react';
import type { BatchPredictionSummary } from '../types';

type Props = {
  summary: BatchPredictionSummary | null;
  loading?: boolean;
};

const pct = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;

export const BatchSummaryCard: React.FC<Props> = ({ summary, loading = false }) => {
  return (
    <div className="card-base md:col-span-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-zinc-100 rounded-lg">
          <Layers className="w-5 h-5 text-zinc-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Batch file summary</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Every row in the uploaded CSV or JSON array</p>
        </div>
      </div>

      {loading ? (
        <div className="h-24 bg-zinc-100 rounded-xl animate-pulse" />
      ) : !summary ? (
        <p className="text-sm text-zinc-500">
          Upload a file and click <strong>Run entire file</strong> to see success vs failure ratios.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/80">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total rows</p>
              <p className="text-2xl font-black text-zinc-900 tabular-nums mt-1">{summary.total}</p>
            </div>
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/60">
              <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Predicted success</p>
              <p className="text-2xl font-black text-emerald-800 tabular-nums mt-1">
                {summary.success_count}{' '}
                <span className="text-base font-semibold">({pct(summary.success_ratio)})</span>
              </p>
            </div>
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/60">
              <p className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Predicted failure</p>
              <p className="text-2xl font-black text-rose-800 tabular-nums mt-1">
                {summary.failure_count}{' '}
                <span className="text-base font-semibold">({pct(summary.failure_ratio)})</span>
              </p>
            </div>
          </div>

          {Object.keys(summary.failure_type_counts).length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-zinc-700 mb-3">Predicted root-cause counts (failures only)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(summary.failure_type_counts)
                  .sort((a, b) => Number(b[1]) - Number(a[1]))
                  .map(([ft, count]) => (
                    <div
                      key={ft}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-zinc-800 break-words">{ft}</span>
                      <span className="text-sm font-bold text-zinc-600 tabular-nums">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          ) : summary.failure_count > 0 ? (
            <p className="text-xs text-zinc-500">Failure rows had no root-cause labels returned.</p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default BatchSummaryCard;
