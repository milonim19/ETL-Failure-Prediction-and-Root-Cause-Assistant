import React from 'react';
import { motion } from 'motion/react';
import { GitCompare, Plus, History } from 'lucide-react';

const Compare: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Compare Runs</h1>
          <p className="text-zinc-500 mt-1">Analyze performance differences between pipeline versions.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary flex items-center gap-2 text-sm">
            <History className="w-4 h-4" />
            History
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            New Comparison
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[ 'Baseline Run', 'Target Run' ].map((title, idx) => (
          <motion.div 
            key={title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="card-base border-2 border-dashed border-zinc-200 bg-zinc-50/30 flex flex-col items-center justify-center min-h-[300px] text-center group cursor-pointer hover:bg-white"
          >
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900">{title}</h3>
            <p className="text-sm text-zinc-500 mt-1">Select a historical run to compare</p>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 p-12 border border-zinc-200 rounded-[2rem] bg-zinc-50/50 flex flex-col items-center justify-center text-center"
      >
        <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center mb-4">
          <GitCompare className="w-6 h-6 text-zinc-400" />
        </div>
        <p className="text-sm font-medium text-zinc-900">No Comparison Active</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs">
          Select two pipeline runs above to generate a delta report and root-cause comparison.
        </p>
      </motion.div>
    </div>
  );
};

export default Compare;
