import React from 'react';
import { motion } from 'motion/react';
import UploadCard from '../components/UploadCard';
import PredictionCard from '../components/PredictionCard';
import MetricsCard from '../components/MetricsCard';
import BatchSummaryCard from '../components/BatchSummaryCard';
import { LayoutDashboard, Info } from 'lucide-react';
import { predictETL, predictETLBatch } from '../services/api';
import type {
  BatchPredictionSummary,
  PredictRequest,
  PredictionResponse,
  RunMetrics,
} from '../types';
import {
  csvRowToPredictRequest,
  parseCsvContent,
  summarizeCsvTable,
  type ParsedCsvTable,
} from '../utils/csvParse';

const ANALYSIS_STATE_KEY = 'etl_analysis_state_v1';
const MAX_CACHED_ROWS = 5000;

type PersistedAnalysisState = {
  payload: PredictRequest;
  prediction: PredictionResponse | null;
  batchSummary: BatchPredictionSummary | null;
  selectedFileName: string | null;
  parsedCsvTable: ParsedCsvTable | null;
  parsedJsonRuns: PredictRequest[] | null;
  csvRowIndex: number;
};

const DEFAULT_STATE: PersistedAnalysisState = {
  payload: {
    duration: 0,
    retry_count: 0,
    status: '',
    error_type: '',
    message: '',
  },
  prediction: null,
  batchSummary: null,
  selectedFileName: null,
  parsedCsvTable: null,
  parsedJsonRuns: null,
  csvRowIndex: 0,
};

const readPersistedAnalysisState = (): PersistedAnalysisState => {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(ANALYSIS_STATE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedAnalysisState>;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
};

const writePersistedAnalysisState = (snapshot: PersistedAnalysisState) => {
  if (typeof window === 'undefined') return;
  try {
    // Avoid bloating localStorage with very large parsed tables.
    const trimmed: PersistedAnalysisState = {
      ...snapshot,
      parsedCsvTable:
        snapshot.parsedCsvTable && snapshot.parsedCsvTable.rows.length <= MAX_CACHED_ROWS
          ? snapshot.parsedCsvTable
          : null,
      parsedJsonRuns:
        snapshot.parsedJsonRuns && snapshot.parsedJsonRuns.length <= MAX_CACHED_ROWS
          ? snapshot.parsedJsonRuns
          : null,
    };
    window.localStorage.setItem(ANALYSIS_STATE_KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded or storage unavailable — silently skip.
  }
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNonEmptyString = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

/** One JSON object → API shape (training schema). */
const recordToPredictRequest = (raw: Record<string, unknown>): PredictRequest => {
  const durationValue = raw.duration ?? raw.latency ?? raw.time_taken;
  const retriesValue = raw.retry_count ?? raw.retries ?? raw.retry;
  const statusValue = raw.status ?? raw.run_status ?? 'failed';
  const errorTypeValue =
    raw.error_type ?? raw.error ?? raw.failure_type ?? 'unknown';

  return {
    duration: toNumber(durationValue, 0),
    retry_count: toNumber(retriesValue, 0),
    status: toNonEmptyString(statusValue, 'failed'),
    error_type: toNonEmptyString(errorTypeValue, 'unknown'),
    message: raw.message !== undefined && raw.message !== null ? String(raw.message) : undefined,
  };
};

/**
 * Accepts `[{...}]`, `{ "samples": [...] }`, or a single `{...}` (same formats as inference eval JSON).
 */
const parseJsonInferenceFile = (text: string): PredictRequest[] => {
  const parsed = JSON.parse(text) as unknown;

  const fromRecord = (r: Record<string, unknown>): PredictRequest =>
    recordToPredictRequest(r);

  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => {
      if (item === null || typeof item !== 'object' || Array.isArray(item)) return [];
      return [fromRecord(item as Record<string, unknown>)];
    });
  }

  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    const samples = obj.samples;
    if (Array.isArray(samples)) {
      return samples.flatMap((item) => {
        if (item === null || typeof item !== 'object' || Array.isArray(item)) return [];
        return [fromRecord(item as Record<string, unknown>)];
      });
    }
    return [fromRecord(obj)];
  }

  return [];
};

const normalizePrediction = (raw: unknown): PredictionResponse => {
  const data = (raw ?? {}) as Record<string, unknown>;
  const probability = toNumber(data.probability, 0);
  const status = data.status === 'FAIL' ? 'FAIL' : 'SUCCESS';
  const failureTypeRaw = data.failure_type;
  const failureType =
    typeof failureTypeRaw === 'string' && failureTypeRaw.trim().length > 0
      ? failureTypeRaw
      : null;

  return {
    probability: Math.max(0, Math.min(1, probability)),
    status,
    failure_type: failureType,
    id: typeof data.id === 'string' ? data.id : undefined,
    timestamp: typeof data.timestamp === 'string' ? data.timestamp : undefined,
    message: typeof data.message === 'string' ? data.message : undefined,
    model: typeof data.model === 'string' ? data.model : undefined,
    metrics:
      typeof data.metrics === 'object' && data.metrics !== null
        ? (data.metrics as RunMetrics)
        : undefined,
    shap_values: Array.isArray(data.shap_values)
      ? data.shap_values
          .map((item) => {
            const row = item as Record<string, unknown>;
            const feature = typeof row.feature === 'string' ? row.feature : '';
            const impact = toNumber(row.impact, 0);
            if (!feature) return null;
            return { feature, impact };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
      : undefined,
  };
};

const extractPayloadFromText = (
  text: string,
  fileName: string,
): PredictRequest => {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith('.json')) {
    const runs = parseJsonInferenceFile(text);
    if (runs.length > 0) return runs[0];
    return {
      duration: 0,
      retry_count: 0,
      status: 'failed',
      error_type: 'unknown',
    };
  }

  const duration = text.match(/duration[:=\s]+(\d+(\.\d+)?)/i)?.[1];
  const retries = text.match(/re(tr(y|ies)|try_count)[:=\s]+(\d+)/i)?.[3];
  const status = text.match(/status[:=\s]+([a-z_]+)/i)?.[1];
  const errorType = text.match(/error(_type)?[:=\s]+([a-z_]+)/i)?.[2];
  const raw: Record<string, unknown> = {
    duration,
    retry_count: retries,
    status,
    error_type: errorType,
    message: text.slice(0, 200),
  };

  const durationValue = raw.duration ?? raw.latency ?? raw.time_taken;
  const retriesValue = raw.retry_count ?? raw.retries ?? raw.retry;
  const statusValue = raw.status ?? raw.run_status ?? 'failed';
  const errorTypeValue = raw.error_type ?? raw.error ?? raw.failure_type ?? 'unknown';

  return {
    duration: toNumber(durationValue, 0),
    retry_count: toNumber(retriesValue, 0),
    status: toNonEmptyString(statusValue, 'failed'),
    error_type: toNonEmptyString(errorTypeValue, 'unknown'),
    message: raw.message ? String(raw.message) : undefined,
  };
};

const Analysis: React.FC = () => {
  const persisted = React.useRef<PersistedAnalysisState>(readPersistedAnalysisState());
  const [payload, setPayload] = React.useState<PredictRequest>(persisted.current.payload);
  const [prediction, setPrediction] = React.useState<PredictionResponse | null>(
    persisted.current.prediction,
  );
  const [isLoadingSingle, setIsLoadingSingle] = React.useState(false);
  const [isLoadingBatch, setIsLoadingBatch] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = React.useState<string | null>(
    persisted.current.selectedFileName,
  );
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [parsedCsvTable, setParsedCsvTable] = React.useState<ParsedCsvTable | null>(
    persisted.current.parsedCsvTable,
  );
  const [parsedJsonRuns, setParsedJsonRuns] = React.useState<PredictRequest[] | null>(
    persisted.current.parsedJsonRuns,
  );
  const [csvRowIndex, setCsvRowIndex] = React.useState(persisted.current.csvRowIndex);
  const [batchSummary, setBatchSummary] = React.useState<BatchPredictionSummary | null>(
    persisted.current.batchSummary,
  );

  React.useEffect(() => {
    writePersistedAnalysisState({
      payload,
      prediction,
      batchSummary,
      selectedFileName,
      parsedCsvTable,
      parsedJsonRuns,
      csvRowIndex,
    });
  }, [
    payload,
    prediction,
    batchSummary,
    selectedFileName,
    parsedCsvTable,
    parsedJsonRuns,
    csvRowIndex,
  ]);

  const displayMetrics: RunMetrics = React.useMemo(() => {
    if (batchSummary && batchSummary.total > 0) {
      return {
        duration: batchSummary.average_duration,
        retries: batchSummary.average_retry_count,
        rows: batchSummary.total,
      };
    }
    const m = prediction?.metrics;
    return {
      duration: m?.duration ?? payload.duration,
      retries: m?.retries ?? payload.retry_count,
      rows: m?.rows,
    };
  }, [batchSummary, prediction, payload.duration, payload.retry_count]);

  const handleCsvRowIndexChange = (index: number) => {
    if (parsedJsonRuns && parsedJsonRuns.length > 0) {
      const safeIndex = Math.min(Math.max(index, 0), Math.max(parsedJsonRuns.length - 1, 0));
      setCsvRowIndex(safeIndex);
      setPayload(parsedJsonRuns[safeIndex]);
      return;
    }
    if (!parsedCsvTable) {
      setCsvRowIndex(index);
      return;
    }
    const safeIndex = Math.min(Math.max(index, 0), Math.max(parsedCsvTable.rows.length - 1, 0));
    setCsvRowIndex(safeIndex);
    const cells = parsedCsvTable.rows[safeIndex] ?? [];
    setPayload(csvRowToPredictRequest(parsedCsvTable.headers, cells));
  };

  const handlePredict = async () => {
    if (!payload.status.trim() || !payload.error_type.trim()) {
      setError('Status and error_type are required before analysis.');
      return;
    }
    setIsLoadingSingle(true);
    setError(null);
    try {
      const nextPrediction = await predictETL({ ...payload, explain_shap: true });
      setPrediction(normalizePrediction(nextPrediction));
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Failed to fetch prediction';
      setError(message);
      setPrediction(null);
    } finally {
      setIsLoadingSingle(false);
    }
  };

  const handleRunFullCsv = async () => {
    let runs: PredictRequest[] = [];

    if (parsedCsvTable && parsedCsvTable.rows.length > 0) {
      if (parsedCsvTable.rows.length > 5000) {
        setError('Batch is limited to 5000 rows. Split your file or truncate it.');
        return;
      }
      runs = parsedCsvTable.rows.map((row) =>
        csvRowToPredictRequest(parsedCsvTable.headers, row),
      );
    } else if (parsedJsonRuns && parsedJsonRuns.length > 0) {
      if (parsedJsonRuns.length > 5000) {
        setError('Batch is limited to 5000 rows. Split your file or truncate it.');
        return;
      }
      runs = parsedJsonRuns;
    } else {
      setError('Upload a CSV or a JSON array of run objects first.');
      return;
    }

    setIsLoadingBatch(true);
    setError(null);
    try {
      const summary = await predictETLBatch(runs);
      setBatchSummary(summary);
      setPrediction(null);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Batch prediction failed.';
      setError(message);
      setBatchSummary(null);
    } finally {
      setIsLoadingBatch(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    try {
      const text = await file.text();
      const lowerName = file.name.toLowerCase();

      if (lowerName.endsWith('.csv')) {
        const table = parseCsvContent(text);
        if (table.rows.length === 0) {
          setParsedCsvTable(null);
          throw new Error('CSV has no data rows');
        }

        const summary = summarizeCsvTable(table);
        if (!summary.matchedColumns.duration) {
          throw new Error('CSV must include a duration column');
        }

        const missingCore = [];
        if (!summary.matchedColumns.status) missingCore.push('status');
        if (!summary.matchedColumns.error_type) missingCore.push('error_type');

        setParsedCsvTable(table);
        setParsedJsonRuns(null);
        setCsvRowIndex(0);
        setBatchSummary(null);
        setPayload(csvRowToPredictRequest(table.headers, table.rows[0] ?? []));
        setSelectedFileName(`${file.name} (${table.rows.length} rows)`);
        setUploadError(
          missingCore.length
            ? `Warning: CSV is missing columns: ${missingCore.join(', ')}. Falling back where possible.`
            : null,
        );
        return;
      }

      if (lowerName.endsWith('.json')) {
        let runs: PredictRequest[] = [];
        try {
          runs = parseJsonInferenceFile(text);
        } catch {
          throw new Error('Invalid JSON file');
        }
        if (runs.length === 0) {
          throw new Error(
            'JSON must be an array of run objects or { "samples": [...] }, or one object.',
          );
        }

        setParsedCsvTable(null);
        setCsvRowIndex(0);
        setBatchSummary(null);
        setParsedJsonRuns(runs);
        setPayload(runs[0]);
        setSelectedFileName(`${file.name} (${runs.length} rows)`);
        setUploadError(null);
        return;
      }

      setParsedCsvTable(null);
      setParsedJsonRuns(null);
      setCsvRowIndex(0);
      setBatchSummary(null);
      const parsed = extractPayloadFromText(text, file.name);
      setPayload(parsed);
      setSelectedFileName(file.name);
      setUploadError(null);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Unable to parse the uploaded file.';
      setUploadError(`${message}`);
      setParsedCsvTable(null);
      setParsedJsonRuns(null);
      setCsvRowIndex(0);
      setBatchSummary(null);
      setPrediction(null);
    }
  };

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
          <UploadCard
            value={payload}
            selectedFileName={selectedFileName}
            uploadError={uploadError}
            onChange={setPayload}
            onFileUpload={handleFileUpload}
            onSubmit={handlePredict}
            onRunFullCsv={
              (parsedCsvTable && parsedCsvTable.rows.length > 0) ||
              (parsedJsonRuns && parsedJsonRuns.length > 0)
                ? handleRunFullCsv
                : undefined
            }
            loadingSingle={isLoadingSingle}
            loadingBatch={isLoadingBatch}
            csvRowsTotal={parsedCsvTable?.rows.length ?? parsedJsonRuns?.length ?? null}
            csvRowIndex={csvRowIndex}
            onCsvRowIndexChange={handleCsvRowIndexChange}
          />
          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          
          <div className="mt-6 p-6 rounded-2xl bg-zinc-900 text-white overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Pro Tip</p>
              <p className="text-sm leading-relaxed text-zinc-300">
                SHAP values describe how each field pushes the binary failure estimate (linear layer); run single-row analysis to refresh.
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
          <BatchSummaryCard summary={batchSummary} loading={isLoadingBatch} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <PredictionCard
              prediction={prediction}
              batchSummary={batchSummary}
              loadingSingle={isLoadingSingle}
              loadingBatch={isLoadingBatch}
            />
            <MetricsCard batchMode={batchSummary != null && batchSummary.total > 0} runMetrics={displayMetrics} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Analysis;
