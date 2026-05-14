/** Minimal RFC 4180-style CSV parsing (quoted fields may contain commas and newlines). */

import type { PredictRequest } from '../types';

export type ParsedCsvTable = {
  headers: string[];
  rows: string[][];
};

const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/^["']|["']$/g, '');

/**
 * Parses full CSV content into rows of fields (handles commas inside `"..."`).
 */
export function parseCsvContent(text: string): ParsedCsvTable {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"') {
        if (next === '"') {
          field += '"';
          i += 1;
          continue;
        }
        inQuotes = false;
        continue;
      }
      field += c;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (c === '\r') {
      if (next === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    field += c;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => r.some((cell) => String(cell ?? '').trim().length > 0));
  const headerLine = nonEmptyRows[0]?.map(normalizeHeader) ?? [];
  const dataRows = nonEmptyRows.slice(1);

  return { headers: headerLine, rows: dataRows };
}

export function indicesForExpectedColumns(headers: string[]) {
  const findIdx = (...candidates: string[]) => {
    const set = new Set(candidates.map((c) => c.toLowerCase()));
    const idx = headers.findIndex((h) => set.has(h.toLowerCase()));
    return idx;
  };

  return {
    durationIdx: findIdx('duration'),
    retryIdx: findIdx('retry_count', 'retries', 'retry'),
    statusIdx: findIdx('status', 'run_status'),
    errorIdx: findIdx('error_type', 'error', 'failure_type'),
    messageIdx: findIdx('message', 'msg', 'log', 'notes'),
  };
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNonEmptyString = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

/**
 * Builds a PredictRequest from a CSV row using header names (matches training schema).
 */
export function csvRowToPredictRequest(headers: string[], cells: string[]): PredictRequest {
  const idxMap = indicesForExpectedColumns(headers);
  const pick = (i: number) => (i >= 0 && i < cells.length ? String(cells[i]) : '');

  const durationSrc = idxMap.durationIdx >= 0 ? pick(idxMap.durationIdx) : '';
  const retrySrc =
    idxMap.retryIdx >= 0
      ? pick(idxMap.retryIdx)
      : rawFromGeneric(cells, headers, ['retry_count', 'retries', 'retry']);

  const statusSrc =
    idxMap.statusIdx >= 0 ? pick(idxMap.statusIdx) : rawFromGeneric(cells, headers, ['status', 'run_status']);

  const errorSrc =
    idxMap.errorIdx >= 0 ? pick(idxMap.errorIdx) : rawFromGeneric(cells, headers, ['error_type', 'failure_type', 'error']);

  const messageRaw =
    idxMap.messageIdx >= 0 ? pick(idxMap.messageIdx) : rawFromGeneric(cells, headers, ['message', 'msg', 'log']);

  return {
    duration: durationSrc.trim().length ? toNumber(durationSrc, 0) : 0,
    retry_count: toNumber(retrySrc, 0),
    status: toNonEmptyString(statusSrc, 'failed'),
    error_type: toNonEmptyString(errorSrc, 'unknown'),
    message: messageRaw.trim().length > 0 ? messageRaw.trim() : undefined,
  };
}

/** Fallback lookup when exact header column order is ambiguous */
function rawFromGeneric(cells: string[], headers: string[], keys: string[]) {
  const lowered = headers.map((h) => h.toLowerCase());
  for (const key of keys) {
    const at = lowered.indexOf(key.toLowerCase());
    if (at >= 0) return String(cells[at] ?? '');
  }
  return '';
}

export type CsvParseSummary = {
  rowCount: number;
  matchedColumns: {
    duration: boolean;
    retry_count: boolean;
    status: boolean;
    error_type: boolean;
  };
};

export function summarizeCsvTable(table: ParsedCsvTable): CsvParseSummary {
  const idx = indicesForExpectedColumns(table.headers);
  return {
    rowCount: table.rows.length,
    matchedColumns: {
      duration: idx.durationIdx >= 0,
      retry_count: idx.retryIdx >= 0,
      status: idx.statusIdx >= 0,
      error_type: idx.errorIdx >= 0,
    },
  };
}
