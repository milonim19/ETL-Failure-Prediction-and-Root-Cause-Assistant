import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, ChartSpline, Shield, Zap } from 'lucide-react';
import LatestRunCard from '../components/LatestRunCard';
import RootCauseDistributionCard from '../components/RootCauseDistributionCard';
import TopDriversCard from '../components/TopDriversCard';
import { useRuns } from '../hooks/useRuns';
import type { RunSummary, ShapValue } from '../types';

const Home: React.FC = () => {
  const { latestRun, rootCauseCounts, topShapDrivers, loading, error, refresh } = useRuns(50);
  const showDemoFallback = !latestRun;

  const demoRun: RunSummary = {
    id: 'run_demo_001',
    timestamp: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
    status: 'FAIL',
    failure_type: 'schema_mismatch',
    message: 'column customer_id missing',
    metrics: { duration: 540, retries: 1, null_rate: 0.08, rows: 12000 },
    shap_values: [
      { feature: 'null_rate', impact: 0.25 },
      { feature: 'duration', impact: 0.18 },
      { feature: 'retries', impact: 0.11 },
      { feature: 'rows', impact: -0.06 },
    ],
  };

  const demoCounts = [
    { failure_type: 'schema_mismatch', count: 12 },
    { failure_type: 'timeout', count: 7 },
    { failure_type: 'permissions', count: 3 },
    { failure_type: 'missing_file', count: 2 },
    { failure_type: 'other', count: 4 },
  ];

  const demoDrivers: ShapValue[] = (demoRun.shap_values ?? []).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-6 pt-24 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 text-zinc-900 text-xs font-bold uppercase tracking-widest mb-6 border border-zinc-200">
            <ChartSpline className="w-3 h-3" strokeWidth={2.5} />
            Predictive Analytics
          </div>
          <h1 className="text-6xl font-black tracking-tight leading-[0.9] mb-8 text-zinc-900">
            PREDICT FAILURES <br />
            <span className="text-zinc-400 italic">BEFORE</span> THEY <br />
            STALL DATA.
          </h1>
          <p className="text-lg text-zinc-500 mb-10 max-w-md leading-relaxed">
            A minimalist tool for data engineers to predict ETL pipeline failures and identify root causes with machine learning.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/analysis" className="btn-primary flex items-center gap-2">
              Start Analysis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/compare" className="btn-secondary">
              View History
            </Link>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="min-h-[38rem] lg:min-h-[46rem] bg-zinc-100 rounded-[2.5rem] overflow-hidden border border-zinc-200 shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/10 to-transparent" />
            <div className="absolute inset-0 p-6 lg:p-8">
              <div className="grid grid-cols-1 gap-6 h-full">
                <div className="relative">
                  <LatestRunCard
                    run={showDemoFallback ? demoRun : latestRun}
                    loading={showDemoFallback ? false : loading}
                    error={showDemoFallback ? null : error}
                    onRetry={refresh}
                  />
                  {showDemoFallback ? (
                    <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-zinc-50 text-zinc-600 border-zinc-200">
                      Demo
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RootCauseDistributionCard
                    items={showDemoFallback ? demoCounts : rootCauseCounts}
                    loading={showDemoFallback ? false : loading}
                    error={showDemoFallback ? null : error}
                    onRetry={refresh}
                  />
                  <TopDriversCard
                    drivers={showDemoFallback ? demoDrivers : topShapDrivers}
                    loading={showDemoFallback ? false : loading}
                    error={showDemoFallback ? null : error}
                    onRetry={refresh}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating badges */}
          <div className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-xl border border-zinc-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Reliability</p>
              <p className="text-sm font-bold">99.9% Uptime</p>
            </div>
          </div>

          <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl border border-zinc-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Speed</p>
              <p className="text-sm font-bold">&lt; 50ms Latency</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
