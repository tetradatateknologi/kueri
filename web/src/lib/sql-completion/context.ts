import type { CompletionContext } from "./types";

const TABLE_KEYWORDS = /\b(?:FROM|JOIN|UPDATE|INTO|TABLE)\s*$/i;
const COLUMN_KEYWORDS =
  /\b(?:SELECT|WHERE|ORDER\s+BY|GROUP\s+BY|HAVING|ON|AND|OR|,)\s*$/i;

const FRAGMENT_AT_CURSOR =
  /((?:[a-zA-Z_][\w$]*|"[^"]*"|`[^`]*`)(?:\.(?:(?:[a-zA-Z_][\w$]*|"[^"]*"|`[^`]*`))?)?)$/;

type LexerState = {
  inSingleQuote: boolean;
  inDoubleQuote: boolean;
  inBacktick: boolean;
  inLineComment: boolean;
  inBlockComment: boolean;
};

function isInLiteralOrComment(sql: string, cursorOffset: number): boolean {
  const text = sql.slice(0, cursorOffset);
  const state: LexerState = {
    inSingleQuote: false,
    inDoubleQuote: false,
    inBacktick: false,
    inLineComment: false,
    inBlockComment: false,
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const next = text[i + 1];

    if (state.inLineComment) {
      if (ch === "\n") state.inLineComment = false;
      continue;
    }

    if (state.inBlockComment) {
      if (ch === "*" && next === "/") {
        state.inBlockComment = false;
        i++;
      }
      continue;
    }

    if (state.inSingleQuote) {
      if (ch === "'" && next === "'") {
        i++;
        continue;
      }
      if (ch === "'") state.inSingleQuote = false;
      continue;
    }

    if (state.inDoubleQuote) {
      if (ch === '"' && next === '"') {
        i++;
        continue;
      }
      if (ch === '"') state.inDoubleQuote = false;
      continue;
    }

    if (state.inBacktick) {
      if (ch === "`" && next === "`") {
        i++;
        continue;
      }
      if (ch === "`") state.inBacktick = false;
      continue;
    }

    if (ch === "-" && next === "-") {
      state.inLineComment = true;
      i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      state.inBlockComment = true;
      i++;
      continue;
    }

    if (ch === "'") {
      state.inSingleQuote = true;
      continue;
    }

    if (ch === '"') {
      state.inDoubleQuote = true;
      continue;
    }

    if (ch === "`") {
      state.inBacktick = true;
    }
  }

  return (
    state.inSingleQuote ||
    state.inDoubleQuote ||
    state.inBacktick ||
    state.inLineComment ||
    state.inBlockComment
  );
}

function unquoteIdentifier(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("`") && value.endsWith("`"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function getFragmentAtCursor(beforeCursor: string): string {
  const match = beforeCursor.match(FRAGMENT_AT_CURSOR);
  return match?.[1] ?? "";
}

function parseIdentifierFragment(fragment: string): {
  prefix: string;
  schemaPrefix?: string;
  tableOrAlias?: string;
} {
  if (!fragment) {
    return { prefix: "" };
  }

  if (fragment.endsWith(".")) {
    const head = fragment.slice(0, -1);
    return { prefix: "", schemaPrefix: unquoteIdentifier(head) };
  }

  const dotIndex = fragment.lastIndexOf(".");
  if (dotIndex >= 0) {
    const left = fragment.slice(0, dotIndex);
    const right = fragment.slice(dotIndex + 1);
    return {
      prefix: unquoteIdentifier(right),
      tableOrAlias: unquoteIdentifier(left),
    };
  }

  return { prefix: unquoteIdentifier(fragment) };
}

function isTableReferenceContext(contextText: string): boolean {
  return TABLE_KEYWORDS.test(contextText);
}

function isColumnReferenceContext(contextText: string, beforeCursor: string): boolean {
  if (COLUMN_KEYWORDS.test(contextText)) return true;
  if (/\bSELECT\s+[\w.*,"`\s]*$/i.test(beforeCursor)) return true;
  return false;
}

export function getSqlCompletionContext(input: {
  sql: string;
  cursorOffset: number;
}): CompletionContext {
  const { sql, cursorOffset } = input;
  if (cursorOffset < 0 || cursorOffset > sql.length) {
    return { type: "none" };
  }

  if (isInLiteralOrComment(sql, cursorOffset)) {
    return { type: "none" };
  }

  const beforeCursor = sql.slice(0, cursorOffset);
  const fragment = getFragmentAtCursor(beforeCursor);
  const fragmentStart = fragment ? beforeCursor.length - fragment.length : cursorOffset;
  const contextText = beforeCursor.slice(0, fragmentStart).replace(/\s+$/g, " ");

  const parsed = parseIdentifierFragment(fragment);

  if (fragment.includes(".")) {
    if (fragment.endsWith(".")) {
      if (isTableReferenceContext(contextText)) {
        return {
          type: "table",
          prefix: "",
          schemaPrefix: parsed.schemaPrefix,
        };
      }
      return {
        type: "column",
        prefix: "",
        tableOrAlias: parsed.schemaPrefix,
      };
    }

    return {
      type: "column",
      prefix: parsed.prefix,
      tableOrAlias: parsed.tableOrAlias,
    };
  }

  if (isTableReferenceContext(contextText)) {
    return {
      type: "table",
      prefix: parsed.prefix,
    };
  }

  if (isColumnReferenceContext(contextText, beforeCursor)) {
    return {
      type: "column",
      prefix: parsed.prefix,
    };
  }

  return { type: "none" };
}

export function getCompletionReplaceRange(sql: string, cursorOffset: number): { from: number; to: number } {
  const beforeCursor = sql.slice(0, cursorOffset);
  const fragment = getFragmentAtCursor(beforeCursor);
  if (!fragment) {
    return { from: cursorOffset, to: cursorOffset };
  }
  const from = beforeCursor.length - fragment.length;
  const dotIndex = fragment.lastIndexOf(".");
  if (dotIndex >= 0) {
    return { from: from + dotIndex + 1, to: cursorOffset };
  }
  return { from, to: cursorOffset };
}
