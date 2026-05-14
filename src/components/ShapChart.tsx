import React from 'react';
import { SearchCode } from 'lucide-react';
import type { ShapValue } from '../types';

type ShapChartProps = {
  shapValues?: ShapValue[];
};

const ShapChart: React.FC<ShapChartProps> = ({ shapValues = [] }) => {
  const safeValues = Array.isArray(shapValues)
    ? shapValues.filter(
        (value) =>
          value &&
          typeof value.feature === 'string' &&
          Number.isFinite(Number(value.impact)),
      )
    : [];
  const hasValues = safeValues.length > 0;
  const maxAbsImpact = Math.max(
    ...safeValues.map((v) => Math.abs(Number(v.impact))),
    1e-9,
  );

  return (
    <div className="card-base">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-zinc-100 rounded-lg">
          <SearchCode className="w-5 h-5 text-zinc-600" />
        </div>
        <h2 className="text-lg font-semibold">Root-Cause Analysis (SHAP)</h2>
      </div>
      <p className="text-xs text-zinc-400 mb-3">
        Contributions to modeled failure tendency (binary linear head). Positive values increase modeled
        P(failure); negative decrease it.
      </p>

      {hasValues ? (
        <div className="space-y-3">
          {safeValues.slice(0, 8).map((value) => (
            <div key={value.feature}>
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span>{value.feature}</span>
                <span>{value.impact.toFixed(3)}</span>
              </div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${value.impact >= 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{
                    width: `${Math.min((Math.abs(value.impact) / maxAbsImpact) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-48 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
            <div className="w-6 h-1 bg-zinc-200 rounded-full overflow-hidden">
              <div className="w-2/3 h-full bg-zinc-900" />
            </div>
          </div>
          <p className="text-sm font-medium text-zinc-900">Feature Importance Visualization</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
            Submit telemetry to see which variables are driving failure predictions.
          </p>
        </div>
      )}
    </div>
  );
};

export default ShapChart;
