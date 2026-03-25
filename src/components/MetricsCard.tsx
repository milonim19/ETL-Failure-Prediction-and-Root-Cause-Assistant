import React from 'react';
import { BarChart3, Clock, Database, Zap } from 'lucide-react';

const MetricsCard: React.FC = () => {
  const metrics = [
    { label: 'Throughput', value: '1.2 GB/s', icon: Zap, color: 'text-amber-500' },
    { label: 'Latency', value: '45ms', icon: Clock, color: 'text-blue-500' },
    { label: 'Records', value: '4.2M', icon: Database, color: 'text-purple-500' },
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
        {metrics.map((m) => (
          <div
            key={m.label}
            className="p-4 rounded-xl bg-zinc-50/50 border border-zinc-100 flex flex-col items-center justify-center text-center"
          >
            <m.icon className={`w-5 h-5 mb-2 ${m.color}`} />
            <p
              className={`text-xs text-zinc-500 font-medium uppercase tracking-wider w-full text-center ${
                m.label === 'Throughput' ? '-translate-x-2' : ''
              }`}
            >
              {m.label}
            </p>
            <p
              className={`text-xl font-bold text-zinc-900 mt-1 whitespace-nowrap w-full text-center ${
                m.label === 'Throughput' ? '-translate-x-1' : ''
              }`}
            >
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricsCard;
