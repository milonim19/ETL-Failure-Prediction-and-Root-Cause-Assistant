import React from 'react';
import { BarChart3, Clock, Database, Zap } from 'lucide-react';
import type { RunMetrics } from '../types';

type MetricsCardProps = {
  runMetrics?: RunMetrics;
  /** When true, durations/retries show file-wide averages from batch. */
  batchMode?: boolean;
};

const formatRetries = (value: unknown): string => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '--';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
};

const MetricsCard: React.FC<MetricsCardProps> = ({ runMetrics, batchMode = false }) => {
  const dur =
    runMetrics?.duration !== undefined ? `${Number(runMetrics.duration).toFixed(1)}s` : '--';
  const retries = runMetrics?.retries !== undefined ? formatRetries(runMetrics.retries) : '--';
  const rows = runMetrics?.rows !== undefined ? String(runMetrics.rows) : '--';

  const metricCards = [
    {
      label: batchMode ? 'Avg duration' : 'Duration',
      value: dur,
      icon: Clock,
      color: 'text-blue-500',
    },
    {
      label: batchMode ? 'Avg retries' : 'Retries',
      value: retries,
      icon: Zap,
      color: 'text-amber-500',
    },
    {
      label: batchMode ? 'Rows in file' : 'Records',
      value: rows,
      icon: Database,
      color: 'text-purple-500',
    },
  ];

  return (
    <div className="card-base">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-zinc-100 rounded-lg">
          <BarChart3 className="w-5 h-5 text-zinc-600" />
        </div>
        <h2 className="text-lg font-semibold">Performance Metrics</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metricCards.map((m) => (
          <div
            key={m.label}
            className="p-4 rounded-xl bg-zinc-50/50 border border-zinc-100 flex flex-col items-center justify-center text-center"
          >
            <m.icon className={`w-5 h-5 mb-2 ${m.color}`} />
            <p
              className="text-xs text-zinc-500 font-medium uppercase tracking-wider w-full text-center"
            >
              {m.label}
            </p>
            <p className="text-xl font-bold text-zinc-900 mt-1 whitespace-nowrap w-full text-center">
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricsCard;
