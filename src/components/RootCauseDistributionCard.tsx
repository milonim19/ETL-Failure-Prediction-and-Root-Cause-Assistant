import React, { useMemo } from 'react';
import { PieChart, RotateCcw, TriangleAlert } from 'lucide-react';

type RootCauseCount = { failure_type: string; count: number };

type Props = {
  items: RootCauseCount[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

const palette = [
  { key: 'schema_mismatch', color: '#18181b' }, // zinc-900
  { key: 'timeout', color: '#71717a' }, // zinc-500
  { key: 'permissions', color: '#a1a1aa' }, // zinc-400
  { key: 'missing_file', color: '#d4d4d8' }, // zinc-300
  { key: 'other', color: '#e4e4e7' }, // zinc-200
  { key: 'unknown', color: '#e4e4e7' },
];

const labelize = (s: string) => s.replace(/_/g, ' ');

const pickColor = (failureType: string) => {
  const found = palette.find((p) => p.key === failureType);
  if (found) return found.color;
  return '#d4d4d8';
};

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

export default function RootCauseDistributionCard({ items, loading, error, onRetry }: Props) {
  const total = items.reduce((s, x) => s + x.count, 0);

  const arcs = useMemo(() => {
    if (total <= 0) return [];
    let start = 0;
    return items.map((it) => {
      const angle = (it.count / total) * 360;
      const end = start + angle;
      const path = describeArc(60, 60, 46, start, end);
      start = end;
      return { ...it, path, color: pickColor(it.failure_type) };
    });
  }, [items, total]);

  return (
    <div className="card-base">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 rounded-lg">
            <PieChart className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Root Causes</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Failure types across recent runs</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px] bg-zinc-100 rounded-2xl animate-pulse" />
          <div className="flex-1 space-y-3">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-8 bg-zinc-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50">
          <div className="flex items-start gap-3">
            <TriangleAlert className="w-5 h-5 text-zinc-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-900">Distribution unavailable</p>
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
      ) : total === 0 ? (
        <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50">
          <p className="text-sm font-semibold text-zinc-900">No failure history</p>
          <p className="text-xs text-zinc-500 mt-1">Once failures appear in `GET /runs`, the distribution will show here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative w-[120px] h-[120px] mx-auto">
            <svg viewBox="0 0 120 120" className="w-[120px] h-[120px]">
              <circle cx="60" cy="60" r="46" stroke="#f4f4f5" strokeWidth="12" fill="none" />
              {arcs.map((a) => (
                <path
                  key={a.failure_type}
                  d={a.path}
                  stroke={a.color}
                  strokeWidth="12"
                  strokeLinecap="butt"
                  fill="none"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Failures</p>
              <p className="text-lg font-black text-zinc-900 tabular-nums">{total}</p>
            </div>
          </div>

          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.failure_type} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: pickColor(it.failure_type) }}
                  />
                  <p className="text-xs font-semibold text-zinc-900 break-words">
                    {labelize(it.failure_type)}
                  </p>
                </div>
                <p className="text-xs font-bold text-zinc-500 tabular-nums">{it.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

