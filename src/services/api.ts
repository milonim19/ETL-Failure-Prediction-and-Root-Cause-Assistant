import axios from 'axios';
import type { PredictionResponse, RunsResponse, RunSummary } from '../types';

const DEFAULT_API_BASE_URL = 'http://localhost:8000';

const getApiBaseUrl = () => {
  const fromEnv = import.meta.env.VITE_API_BASE_URL;
  return typeof fromEnv === 'string' && fromEnv.trim().length > 0
    ? fromEnv.replace(/\/$/, '')
    : DEFAULT_API_BASE_URL;
};

export const predictETL = async (data: any): Promise<PredictionResponse> => {
  const response = await axios.post(`${getApiBaseUrl()}/predict`, data);
  return response.data;
};

const normalizeRunsResponse = (data: RunsResponse): RunSummary[] => {
  if (Array.isArray(data)) return data;
  return data.runs ?? [];
};

export const getRuns = async (limit = 50): Promise<RunSummary[]> => {
  const response = await axios.get(`${getApiBaseUrl()}/runs`, { params: { limit } });
  return normalizeRunsResponse(response.data as RunsResponse);
};
