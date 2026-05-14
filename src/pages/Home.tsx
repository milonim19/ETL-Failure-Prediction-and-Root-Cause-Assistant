import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, ChartSpline } from 'lucide-react';
import LatestRunCard from '../components/LatestRunCard';
import RootCauseDistributionCard from '../components/RootCauseDistributionCard';
import TopDriversCard from '../components/TopDriversCard';
import { useRuns } from '../hooks/useRuns';

const Home: React.FC = () => {
  const { latestRun, rootCauseCounts, topShapDrivers, loading, error, refresh } = useRuns(50);

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
                    run={latestRun}
                    loading={loading}
                    error={error}
                    onRetry={refresh}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RootCauseDistributionCard
                    items={rootCauseCounts}
                    loading={loading}
                    error={error}
                    onRetry={refresh}
                  />
                  <TopDriversCard
                    drivers={topShapDrivers}
                    loading={loading}
                    error={error}
                    onRetry={refresh}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
