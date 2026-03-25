import React from 'react';
import { SearchCode } from 'lucide-react';

const ShapChart: React.FC = () => {
  return (
    <div className="card-base">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-zinc-100 rounded-lg">
          <SearchCode className="w-5 h-5 text-zinc-600" />
        </div>
        <h2 className="text-lg font-semibold">Root-Cause Analysis (SHAP)</h2>
      </div>

      <div className="h-48 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
          <div className="w-6 h-1 bg-zinc-200 rounded-full overflow-hidden">
            <div className="w-2/3 h-full bg-zinc-900" />
          </div>
        </div>
        <p className="text-sm font-medium text-zinc-900">Feature Importance Visualization</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-[200px]">
          Upload logs to see which variables are driving failure predictions.
        </p>
      </div>
    </div>
  );
};

export default ShapChart;
