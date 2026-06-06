import type { DatabaseType } from "./types";

const SQL_RESERVED_WORDS = new Set([
  "select",
  "from",
  "where",
  "join",
  "inner",
  "left",
  "right",
  "full",
  "outer",
  "on",
  "and",
  "or",
  "not",
  "in",
  "is",
  "null",
  "as",
  "order",
  "by",
  "group",
  "having",
  "limit",
  "offset",
  "insert",
  "into",
  "update",
  "delete",
  "create",
  "drop",
  "alter",
  "table",
  "index",
  "view",
  "user",
  "order",
  "group",
  "key",
  "primary",
  "foreign",
  "references",
  "default",
  "values",
  "set",
  "union",
  "all",
  "distinct",
  "case",
  "when",
  "then",
  "else",
  "end",
  "exists",
  "between",
  "like",
  "true",
  "false",
]);

const SIMPLE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/i;

function quoteChar(databaseType: DatabaseType): '"' | "`" {
  if (databaseType === "mysql" || databaseType === "mariadb") {
    return "`";
  }
  return '"';
}

export function needsIdentifierQuoting(identifier: string, databaseType: DatabaseType): boolean {
  if (!identifier) return true;
  if (!SIMPLE_IDENTIFIER.test(identifier)) return true;
  if (identifier !== identifier.toLowerCase() && databaseType === "postgres") return true;
  if (SQL_RESERVED_WORDS.has(identifier.toLowerCase())) return true;
  return false;
}

export function quoteIdentifierIfNeeded(identifier: string, databaseType: DatabaseType): string {
  if (!needsIdentifierQuoting(identifier, databaseType)) {
    return identifier;
  }
  const quote = quoteChar(databaseType);
  const escaped = identifier.replaceAll(quote, quote + quote);
  return `${quote}${escaped}${quote}`;
}
