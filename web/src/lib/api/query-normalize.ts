import type { QueryResult, QueryRunResult } from "./types";

export function normalizeRunResult(result: QueryRunResult, cached = false): QueryResult {
  return {
    columns: result.columns,
    rows: result.rows.map((row) => result.columns.map((col) => row[col])),
    rowCount: result.row_count,
    durationMs: result.duration_ms,
    cached,
  };
}
