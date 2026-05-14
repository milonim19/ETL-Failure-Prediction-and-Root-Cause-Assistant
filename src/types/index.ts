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

export type PredictRequest = {
  duration: number;
  retry_count: number;
  status: string;
  error_type: string;
  message?: string;
  /** When true, backend returns grouped SHAP for the binary model (single predict only). */
  explain_shap?: boolean;
  [key: string]: unknown;
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

export type BatchPredictionSummary = {
  total: number;
  success_count: number;
  failure_count: number;
  success_ratio: number;
  failure_ratio: number;
  average_failure_probability: number;
  average_probability_all_rows: number;
  average_duration: number;
  average_retry_count: number;
  top_failure_type: string | null;
  failure_type_counts: Record<string, number>;
};
