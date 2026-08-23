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

/** Offsets of top-level `;` characters, ignoring those inside comments or string literals. */
function findTopLevelSemicolons(sql: string): number[] {
  const positions: number[] = [];
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (ch === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      while (i < sql.length) {
        if (sql[i] === "\\" && i + 1 < sql.length) {
          i += 2;
          continue;
        }
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    if (ch === ";") {
      positions.push(i);
      i++;
      continue;
    }

    i++;
  }

  return positions;
}

/**
 * Returns the SQL statement containing `cursorOffset`, splitting `fullText` on top-level `;`
 * boundaries (ignoring semicolons inside string literals/comments). Falls back to the nearest
 * non-empty statement if the cursor sits in blank space between statements.
 */
export function getStatementAtCursor(fullText: string, cursorOffset: number): string {
  const semicolons = findTopLevelSemicolons(fullText);
  const boundaries = [0, ...semicolons.map((pos) => pos + 1), fullText.length];

  const ranges: Array<[number, number]> = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    ranges.push([boundaries[i], boundaries[i + 1]]);
  }
  if (ranges.length === 0) return "";

  const targetIndex = ranges.findIndex(
    ([start, end]) => cursorOffset >= start && cursorOffset <= end,
  );
  const startIndex = targetIndex === -1 ? ranges.length - 1 : targetIndex;

  const statementAt = (index: number) => trimStatement(fullText.slice(...ranges[index]));

  const direct = statementAt(startIndex);
  if (direct !== "") return direct;

  for (let i = startIndex - 1; i >= 0; i--) {
    const candidate = statementAt(i);
    if (candidate !== "") return candidate;
  }
  for (let i = startIndex + 1; i < ranges.length; i++) {
    const candidate = statementAt(i);
    if (candidate !== "") return candidate;
  }

  return "";
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
