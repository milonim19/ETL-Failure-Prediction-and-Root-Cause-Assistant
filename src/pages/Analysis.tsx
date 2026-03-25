import React from 'react';
import { motion } from 'motion/react';
import UploadCard from '../components/UploadCard';
import PredictionCard from '../components/PredictionCard';
import MetricsCard from '../components/MetricsCard';
import ShapChart from '../components/ShapChart';
import { LayoutDashboard, Info } from 'lucide-react';

const Analysis: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Pipeline Analysis</h1>
          <p className="text-zinc-500 mt-1">Monitor and predict ETL pipeline health in real-time.</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm">
          <Info className="w-4 h-4" />
          Documentation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4"
        >
          <UploadCard />
          
          <div className="mt-6 p-6 rounded-2xl bg-zinc-900 text-white overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Pro Tip</p>
              <p className="text-sm leading-relaxed text-zinc-300">
                Use historical logs for better SHAP accuracy. At least 100 runs are recommended for stable predictions.
              </p>
            </div>
            <LayoutDashboard className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-8 space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <PredictionCard />
            <MetricsCard />
          </div>
          <ShapChart />
        </motion.div>
      </div>
    </div>
  );
};

export default Analysis;
