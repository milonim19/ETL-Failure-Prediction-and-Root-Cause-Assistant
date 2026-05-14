import React from 'react';
import { ArrowRight, FileText, Upload } from 'lucide-react';
import type { PredictRequest } from '../types';

type UploadCardProps = {
  value: PredictRequest;
  loadingSingle?: boolean;
  loadingBatch?: boolean;
  selectedFileName?: string | null;
  uploadError?: string | null;
  csvRowsTotal?: number | null;
  csvRowIndex?: number;
  onCsvRowIndexChange?: (index: number) => void;
  onChange: (next: PredictRequest) => void;
  onFileUpload: (file: File) => Promise<void>;
  /** Single-row prediction (selected row fields). */
  onSubmit: () => void;
  /** All CSV rows scored in one batch (aggregate ratios). */
  onRunFullCsv?: () => void;
};

const UploadCard: React.FC<UploadCardProps> = ({
  value,
  loadingSingle = false,
  loadingBatch = false,
  selectedFileName,
  uploadError,
  csvRowsTotal = null,
  csvRowIndex = 0,
  onCsvRowIndexChange,
  onChange,
  onFileUpload,
  onSubmit,
  onRunFullCsv,
}) => {
  const updateField = (key: keyof PredictRequest, fieldValue: string) => {
    const parsedValue =
      key === 'duration' || key === 'retry_count' ? Number(fieldValue) || 0 : fieldValue;
    onChange({ ...value, [key]: parsedValue });
  };

  const busy = loadingSingle || loadingBatch;

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await onFileUpload(file);
    event.target.value = '';
  };

  return (
    <div className="card-base">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-zinc-100 rounded-lg">
          <Upload className="w-5 h-5 text-zinc-600" />
        </div>
        <h2 className="text-lg font-semibold">Upload ETL Logs</h2>
      </div>
      
      <div className="group relative border-2 border-dashed border-zinc-200 rounded-xl p-5 transition-colors hover:border-zinc-400 hover:bg-zinc-50/50">
        <input
          type="file"
          accept=".json,.csv,.log,.txt"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
        />
        <div className="text-center">
          <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2 group-hover:text-zinc-400 transition-colors" />
          <p className="text-sm font-medium text-zinc-900">Click or drag ETL logs here</p>
          <p className="text-xs text-zinc-500 mt-1">Supports JSON, CSV, LOG, TXT</p>
          {selectedFileName ? (
            <p className="text-xs text-emerald-700 mt-2">Loaded: {selectedFileName}</p>
          ) : null}
          {uploadError ? <p className="text-xs text-amber-700 mt-2">{uploadError}</p> : null}
        </div>
      </div>

      {typeof csvRowsTotal === 'number' && csvRowsTotal > 1 && onCsvRowIndexChange ? (
        <label className="block text-xs text-zinc-600 mt-4">
          Row ({csvRowIndex + 1} / {csvRowsTotal})
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white"
            value={Math.min(csvRowIndex, Math.max(csvRowsTotal - 1, 0))}
            onChange={(event) => onCsvRowIndexChange(Number.parseInt(event.target.value, 10))}
          >
            {Array.from({ length: csvRowsTotal }).map((_, idx) => (
              <option key={`csv-row-${idx}`} value={idx}>
                Row {idx + 1}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-zinc-500 mt-1 block">
            Pick a row to preview fields (CSV or JSON array), then analyze it — or run the entire file as a batch.
          </span>
        </label>
      ) : null}

      <div className="space-y-4 border border-zinc-200 rounded-xl p-4 bg-zinc-50/40 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-zinc-600">
            Duration
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={value.duration}
              onChange={(event) => updateField('duration', event.target.value)}
            />
          </label>
          <label className="text-xs text-zinc-600">
            Retry Count
            <input
              type="number"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={value.retry_count}
              onChange={(event) => updateField('retry_count', event.target.value)}
            />
          </label>
        </div>
        <label className="text-xs text-zinc-600 block">
          Status
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={value.status}
            onChange={(event) => updateField('status', event.target.value)}
            placeholder="failed / success"
          />
        </label>
        <label className="text-xs text-zinc-600 block">
          Error Type
          <input
            type="text"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            value={value.error_type}
            onChange={(event) => updateField('error_type', event.target.value)}
            placeholder="timeout / schema_mismatch"
          />
        </label>
        <label className="text-xs text-zinc-600 block">
          Message (Optional)
          <textarea
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            rows={3}
            value={value.message ?? ''}
            onChange={(event) => updateField('message', event.target.value)}
          />
        </label>
        <div className="text-xs text-zinc-500">
          Enter telemetry fields and submit to run binary + multiclass inference.
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-6">
        <button
          type="button"
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          onClick={onSubmit}
          disabled={busy}
        >
          {loadingSingle ? 'Running...' : 'Analyze selected row'}
          <ArrowRight className="w-4 h-4" />
        </button>
        {typeof csvRowsTotal === 'number' && csvRowsTotal >= 1 && onRunFullCsv ? (
          <button
            type="button"
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            onClick={onRunFullCsv}
            disabled={busy}
          >
            {loadingBatch ? 'Running all rows…' : `Run entire file (${csvRowsTotal} rows)`}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default UploadCard;
