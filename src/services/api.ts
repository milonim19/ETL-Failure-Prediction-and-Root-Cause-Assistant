import axios, { isAxiosError } from 'axios';
import type {
  BatchPredictionSummary,
  PredictRequest,
  PredictionResponse,
  RunsResponse,
  RunSummary,
} from '../types';

const DEFAULT_API_BASE_URL = 'http://localhost:8000';

const getApiBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  return typeof fromEnv === 'string' && fromEnv.trim().length > 0
    ? fromEnv.replace(/\/$/, '')
    : DEFAULT_API_BASE_URL;
};

export const predictETL = async (data: PredictRequest): Promise<PredictionResponse> => {
  const response = await axios.post(`${getApiBaseUrl()}/predict`, data);
  return response.data;
};

const aggregatePredictionsLocally = async (
  runs: PredictRequest[],
): Promise<BatchPredictionSummary> => {
  let successCount = 0;
  let failureCount = 0;
  let probSumFailure = 0;
  let probSumAll = 0;
  let durationSum = 0;
  let retrySum = 0;
  const failureTypeCounts: Record<string, number> = {};

  for (const row of runs) {
    durationSum += Number(row.duration) || 0;
    retrySum += Number(row.retry_count) || 0;
    const p = await predictETL(row);
    probSumAll += p.probability;
    if (p.status === 'SUCCESS') {
      successCount += 1;
      continue;
    }
    failureCount += 1;
    probSumFailure += p.probability;
    if (typeof p.failure_type === 'string' && p.failure_type.trim().length > 0) {
      const key = p.failure_type;
      failureTypeCounts[key] = (failureTypeCounts[key] ?? 0) + 1;
    }
  }

  const total = runs.length || successCount + failureCount;
  const fc = failureCount || 0;
  const fts = failureTypeCounts;
  const topEntries = Object.entries(fts);
  const top_failure_type =
    topEntries.length > 0
      ? [...topEntries].sort((a, b) => b[1] - a[1])[0][0]
      : null;

  return {
    total,
    success_count: successCount,
    failure_count: fc,
    success_ratio: total ? successCount / total : 0,
    failure_ratio: total ? fc / total : 0,
    average_failure_probability: fc ? probSumFailure / fc : 0,
    average_probability_all_rows: total ? probSumAll / total : 0,
    average_duration: total ? durationSum / total : 0,
    average_retry_count: total ? retrySum / total : 0,
    top_failure_type,
    failure_type_counts: failureTypeCounts,
  };
};

export const predictETLBatch = async (
  runs: PredictRequest[],
): Promise<BatchPredictionSummary> => {
  try {
    const response = await axios.post(`${getApiBaseUrl()}/predict/batch`, { runs });
    return response.data as BatchPredictionSummary;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404 && runs.length > 0) {
      return aggregatePredictionsLocally(runs);
    }
    throw error;
  }
};

const normalizeRunsResponse = (data: RunsResponse): RunSummary[] => {
  if (Array.isArray(data)) return data;
  return data.runs ?? [];
};

export const getRuns = async (limit = 50): Promise<RunSummary[]> => {
  const response = await axios.get(`${getApiBaseUrl()}/runs`, { params: { limit } });
  return normalizeRunsResponse(response.data as RunsResponse);
};
