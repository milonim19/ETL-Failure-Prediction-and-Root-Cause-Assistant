export type RunStatus = 'FAIL' | 'SUCCESS';

export type ShapValue = {
  feature: string;
  impact: number;
};

export type RunMetrics = {
  duration?: number;
  retries?: number;
  null_rate?: number;
  rows?: number;
  [key: string]: unknown;
};

export type PredictionResponse = {
  probability: number;
  status: RunStatus;
  failure_type: string | null;
  shap_values?: ShapValue[];
  metrics?: RunMetrics;
  // Optional metadata fields (safe to ignore if backend doesn't provide)
  id?: string;
  timestamp?: string;
  message?: string;
  model?: string;
};

export type RunSummary = {
  id: string;
  timestamp: string;
  status: RunStatus;
  failure_type: string | null;
  metrics?: RunMetrics;
  shap_values?: ShapValue[];
  message?: string;
  model?: string;
};

export type RunsResponse = { runs: RunSummary[] } | RunSummary[];
