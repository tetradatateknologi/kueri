import type { QueryResultColumn } from "@/lib/api/types";

export type QueryFilterEligibility = {
  enabled: boolean;
  reason?: string;
  strategy: "server-wrapper" | "client-loaded-rows" | "none";
  filterableColumns: string[];
};

const LEADING_SELECT_RE = /^\s*select\b/i;
const LEADING_READ_RE = /^\s*(with\b|select\b)/i;
const UNION_RE = /\b(union|intersect|except)\b/i;
const GROUP_BY_RE = /\bgroup\s+by\b/i;
const HAVING_RE = /\bhaving\b/i;
const WINDOW_RE = /\bover\s*\(/i;
const AGGREGATE_RE = /\b(count|sum|avg|min|max)\s*\(/i;

function trimStatement(sql: string): string {
  let cleaned = sql.trim();
  if (cleaned.endsWith(";")) {
    cleaned = cleaned.slice(0, -1).trim();
  }
  return cleaned;
}

function stripSQLCommentsAndLiterals(sql: string): string {
  let out = "";
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") {
        out += " ";
        i++;
      }
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < sql.length) {
        if (sql[i] === "*" && sql[i + 1] === "/") {
          out += "  ";
          i += 2;
          break;
        }
        out += " ";
        i++;
      }
      continue;
    }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      out += " ";
      i++;
      while (i < sql.length) {
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            i += 2;
            continue;
          }
          out += " ";
          i++;
          break;
        }
        if (ch === "'" && sql[i] === "\\" && i + 1 < sql.length) {
          i += 2;
          continue;
        }
        i++;
      }
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

function hasMultipleStatements(sql: string): boolean {
  return stripSQLCommentsAndLiterals(trimStatement(sql)).includes(";");
}

function hasDuplicateColumns(columns: QueryResultColumn[]): boolean {
  const seen = new Set<string>();
  for (const col of columns) {
    const key = col.name.trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function hasUnnamedColumns(columns: QueryResultColumn[]): boolean {
  return columns.some((col) => col.name.trim() === "");
}

export function analyzeQueryFilterEligibility(input: {
  sql: string;
  columns: QueryResultColumn[];
}): QueryFilterEligibility {
  const disabled = (reason: string): QueryFilterEligibility => ({
    enabled: false,
    reason,
    strategy: "none",
    filterableColumns: [],
  });

  const cleaned = trimStatement(input.sql);
  if (!LEADING_READ_RE.test(cleaned)) {
    return disabled("Only SELECT queries support column filtering.");
  }
  if (!LEADING_SELECT_RE.test(cleaned)) {
    return disabled("Query is too complex for UI column filtering.");
  }
  if (hasMultipleStatements(input.sql)) {
    return disabled("Multiple SQL statements are not supported for column filtering.");
  }

  const normalized = stripSQLCommentsAndLiterals(cleaned);
  if (UNION_RE.test(normalized)) {
    return disabled("UNION, INTERSECT, and EXCEPT queries cannot be filtered from the UI.");
  }
  if (GROUP_BY_RE.test(normalized)) {
    return disabled("GROUP BY queries cannot be filtered from the UI.");
  }
  if (HAVING_RE.test(normalized)) {
    return disabled("HAVING clauses cannot be combined with UI column filtering.");
  }
  if (WINDOW_RE.test(normalized)) {
    return disabled("Window functions cannot be filtered safely from the UI.");
  }
  if (AGGREGATE_RE.test(normalized)) {
    return disabled("Aggregate queries cannot be filtered from the UI.");
  }

  if (input.columns.length > 0) {
    if (hasDuplicateColumns(input.columns)) {
      return disabled("Duplicate column names found. Use unique column aliases to enable filtering.");
    }
    if (hasUnnamedColumns(input.columns)) {
      return disabled("Unnamed result columns cannot be filtered from the UI.");
    }
  }

  const filterableColumns = input.columns.filter((c) => c.filterable).map((c) => c.name);
  if (filterableColumns.length === 0 && input.columns.length > 0) {
    return disabled("Column filters are unavailable for this query.");
  }

  return {
    enabled: true,
    strategy: "server-wrapper",
    filterableColumns:
      filterableColumns.length > 0 ? filterableColumns : input.columns.map((c) => c.name),
  };
}
