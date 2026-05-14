import React from 'react';
import { AlertCircle, Layers2, ShieldCheck } from 'lucide-react';
import type { BatchPredictionSummary, PredictionResponse } from '../types';

type PredictionCardProps = {
  prediction: PredictionResponse | null;
  /** Whole-file aggregates from Run entire file — takes priority over single-row prediction. */
  batchSummary: BatchPredictionSummary | null;
  loadingSingle?: boolean;
  loadingBatch?: boolean;
};

const pct = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;

const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  batchSummary,
  loadingSingle = false,
  loadingBatch = false,
}) => {
  const loading = loadingSingle || loadingBatch;
  const fileMode = batchSummary != null && batchSummary.total > 0;

  const failureProbability = fileMode
    ? batchSummary.average_probability_all_rows
    : prediction
      ? prediction.probability
      : null;
  const successProbability =
    failureProbability !== null ? Math.max(0, Math.min(1, 1 - failureProbability)) : null;
  const failureProbabilityText =
    failureProbability !== null ? `${(failureProbability * 100).toFixed(1)}%` : '--';
  const successProbabilityText =
    successProbability !== null ? `${(successProbability * 100).toFixed(1)}%` : '--';

  const outcomeBad = fileMode
    ? batchSummary.failure_count > batchSummary.success_count
    : prediction?.status === 'FAIL';

  const riskLabel =
    prediction && !fileMode
      ? prediction.status === 'FAIL'
        ? prediction.probability > 0.8
          ? 'High'
          : 'Moderate'
        : 'Minimal'
      : fileMode
        ? batchSummary.failure_ratio >= 0.4
          ? 'High'
          : batchSummary.failure_ratio >= 0.15
            ? 'Moderate'
            : 'Low'
        : 'Unknown';

  const headline = (): string => {
    if (loading) return 'Computing...';
    if (fileMode) {
      const s = batchSummary.success_count;
      const f = batchSummary.failure_count;
      const n = batchSummary.total;
      return `${s}/${n} predicted success · ${f} predicted FAIL`;
    }
    return prediction?.status ?? 'No prediction yet';
  };

  const failureTypeLine = (): string => {
    if (fileMode) {
      const top = batchSummary.top_failure_type;
      if (!top?.trim())
        return Object.keys(batchSummary.failure_type_counts).length
          ? 'Mixed (see table below)'
          : 'None in batch';
      return `${top} (most common)`;
    }
    return prediction?.failure_type ?? 'None detected';
  };

  const hasAny = fileMode || prediction != null;

  return (
    <div className="card-base">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Prediction Status</h2>
        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 uppercase tracking-wider">
          Live
        </span>
      </div>

      <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
          {!hasAny ? (
            <ShieldCheck className="w-6 h-6 text-zinc-400" />
          ) : fileMode ? (
            <Layers2 className="w-6 h-6 text-indigo-500" />
          ) : outcomeBad ? (
            <AlertCircle className="w-6 h-6 text-rose-500" />
          ) : (
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          )}
        </div>
        <div>
          <p className="text-sm text-zinc-500 font-medium">
            {fileMode ? 'Whole file (batch)' : 'Latest single run'}
          </p>
          <p className="text-xl font-bold text-zinc-900">{headline()}</p>
          {fileMode ? (
            <p className="text-xs text-zinc-400 mt-0.5">
              Failure rate about {pct(batchSummary.failure_ratio)} across {batchSummary.total} rows.
            </p>
          ) : null}
        </div>
      </div>

      {!loading && !hasAny ? (
        <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
          Run <strong>Run entire file</strong> after uploading CSV/JSON to see file-level predictions here,
          or <strong>Analyze selected row</strong> when you only want one-row results (shown here only if no
          batch summary is loaded yet).
        </p>
      ) : null}

      {!loading && fileMode ? (
        <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
          Values below summarize the entire uploaded file using mean failure risk across all rows. Single-row SHAP still
          uses <strong>Analyze selected row</strong> below when you want token-level attribution.
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
          <p className="text-xs text-zinc-500 mb-1">Risk level</p>
          <p
            className={`text-sm font-semibold ${
              riskLabel === 'High' || riskLabel === 'Moderate' ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {riskLabel}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
          <p className="text-xs text-zinc-500 mb-1">{fileMode ? 'Avg failure risk (all rows)' : 'Failure probability'}</p>
          <p className="text-sm font-semibold text-zinc-700">{failureProbabilityText}</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
          <p className="text-xs text-zinc-500 mb-1">{fileMode ? 'Avg success-ish (compl.)' : 'Success probability'}</p>
          <p className="text-sm font-semibold text-zinc-700">{successProbabilityText}</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50/50 border border-zinc-100 md:col-span-3">
          <p className="text-xs text-zinc-500 mb-1">{fileMode ? 'Top predicted root cause' : 'Failure type'}</p>
          <p className="text-sm font-semibold text-zinc-700">{failureTypeLine()}</p>
        </div>
      </div>
    </div>
  );
};

export default PredictionCard;
