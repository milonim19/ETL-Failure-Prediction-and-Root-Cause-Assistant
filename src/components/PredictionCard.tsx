import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

const PredictionCard: React.FC = () => {
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
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm text-zinc-500 font-medium">System Health</p>
          <p className="text-xl font-bold text-zinc-900">98.2% Success Probability</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
          <p className="text-xs text-zinc-500 mb-1">Risk Level</p>
          <p className="text-sm font-semibold text-emerald-600">Minimal</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-50/50 border border-zinc-100">
          <p className="text-xs text-zinc-500 mb-1">Failure Type</p>
          <p className="text-sm font-semibold text-zinc-400">None Detected</p>
        </div>
      </div>
    </div>
  );
};

export default PredictionCard;
