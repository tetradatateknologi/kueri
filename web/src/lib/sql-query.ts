import { DEFAULT_QUERY_LIMIT } from "@/lib/api/query-config";

export { DEFAULT_QUERY_LIMIT };

const LEADING_READ_RE = /^\s*(with\b|select\b)/i;

function trimStatement(sql: string): string {
  let cleaned = sql.trim();
  if (cleaned.endsWith(";")) {
    cleaned = cleaned.slice(0, -1).trim();
  }
  return cleaned;
}

/** Removes comments and string literals so keyword detection ignores LIMIT in comments/quotes. */
export function stripSQLCommentsAndLiterals(sql: string): string {
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

    if (ch === "'") {
      out += " ";
      i++;
      while (i < sql.length) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            i += 2;
            continue;
          }
          out += " ";
          i++;
          break;
        }
        if (sql[i] === "\\" && i + 1 < sql.length) {
          i += 2;
          continue;
        }
        i++;
      }
      continue;
    }

    if (ch === '"') {
      out += " ";
      i++;
      while (i < sql.length) {
        if (sql[i] === '"') {
          if (sql[i + 1] === '"') {
            i += 2;
            continue;
          }
          out += " ";
          i++;
          break;
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

export function isReadQuery(sql: string): boolean {
  return LEADING_READ_RE.test(trimStatement(sql));
}

export function hasExplicitLimit(sql: string): boolean {
  const normalized = stripSQLCommentsAndLiterals(trimStatement(sql)).trim();
  return /\blimit\s+\d+(?:\s+offset\s+\d+)?\s*$/i.test(normalized);
}

export function shouldAutoLimit(sql: string): boolean {
  return isReadQuery(sql) && !hasExplicitLimit(sql);
}

export function nextQueryOffset(loadedRowCount: number): number {
  return loadedRowCount;
}

export function defaultBatchLimit(): number {
  return DEFAULT_QUERY_LIMIT;
}
