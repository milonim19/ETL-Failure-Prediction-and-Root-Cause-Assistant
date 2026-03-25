import React from 'react';
import { Sparkles, RotateCcw, TriangleAlert } from 'lucide-react';
import type { ShapValue } from '../types';

type Props = {
  drivers: ShapValue[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const fmt = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1) return n.toFixed(2);
  if (abs >= 0.1) return n.toFixed(3);
  return n.toFixed(4);
};

export default function TopDriversCard({ drivers, loading, error, onRetry }: Props) {
  const maxAbs = drivers.reduce((m, d) => Math.max(m, Math.abs(d.impact)), 0) || 1;

  return (
    <div className="card-base">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 rounded-lg">
            <Sparkles className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Top Drivers</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Why the latest prediction looks this way</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="h-10 bg-zinc-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50">
          <div className="flex items-start gap-3">
            <TriangleAlert className="w-5 h-5 text-zinc-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-900">Drivers unavailable</p>
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
      ) : drivers.length === 0 ? (
        <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50">
          <p className="text-sm font-semibold text-zinc-900">No SHAP data</p>
          <p className="text-xs text-zinc-500 mt-1">When the model returns `shap_values`, they’ll show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drivers.map((d) => {
            const pct = (Math.abs(d.impact) / maxAbs) * 100;
            const positive = d.impact >= 0;
            return (
              <div key={d.feature} className="p-3 rounded-xl border border-zinc-200 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{d.feature}</p>
                  <p className="text-xs font-bold text-zinc-500 tabular-nums">
                    {positive ? '+' : '−'}
                    {fmt(Math.abs(d.impact))}
                  </p>
                </div>
                <div className="mt-2 h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className={positive ? 'h-full bg-zinc-900' : 'h-full bg-zinc-500'}
                    style={{ width: `${Math.max(6, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

