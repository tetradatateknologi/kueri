import type { Completion } from "@codemirror/autocomplete";

import { extractReferencedTables, extractSimpleTableAliases } from "./aliases";
import type { CompletionContext, CompletionSchemaTable, SqlCompletionSchema } from "./types";
import { MAX_COLUMN_COMPLETIONS, MAX_TABLE_COMPLETIONS } from "./types";
import { quoteIdentifierIfNeeded } from "./identifier";

type MatchRank = 0 | 1 | 2 | 3;

function matchRank(prefix: string, candidate: string): MatchRank | null {
  const p = prefix.toLowerCase();
  const c = candidate.toLowerCase();
  if (!p) return 1;
  if (c === p) return 0;
  if (c.startsWith(p)) return 1;
  if (c.includes(p)) return 2;
  return null;
}

function compareRank(a: MatchRank, b: MatchRank): number {
  return a - b;
}

function tableKey(schema: string | undefined, table: string): string {
  return `${schema ?? ""}\0${table}`;
}

function findTable(
  tables: CompletionSchemaTable[],
  schema: string | undefined,
  table: string,
): CompletionSchemaTable | undefined {
  return tables.find(
    (t) =>
      t.name.toLowerCase() === table.toLowerCase() &&
      (schema == null || (t.schema ?? "").toLowerCase() === schema.toLowerCase()),
  );
}

function formatColumnDetail(column: {
  dataType?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}): string {
  const parts: string[] = [];
  if (column.dataType) parts.push(column.dataType);
  if (column.isPrimaryKey) parts.push("PK");
  if (column.isForeignKey) parts.push("FK");
  return parts.join(" · ");
}

function buildTableCompletions(
  schema: SqlCompletionSchema,
  sql: string,
  context: Extract<CompletionContext, { type: "table" }>,
): Completion[] {
  const { tables, databaseType, defaultSchema } = schema;
  const referenced = new Set(
    extractReferencedTables(sql).map((t) => tableKey(t.schema, t.table)),
  );

  const candidates = tables
    .map((table) => {
      const label = table.name;
      const fullName = table.schema ? `${table.schema}.${table.name}` : table.name;
      const rank = matchRank(context.prefix, label);
      if (rank == null && context.schemaPrefix) {
        if ((table.schema ?? "").toLowerCase() !== context.schemaPrefix.toLowerCase()) {
          return null;
        }
        const schemaRank = matchRank(context.prefix, label);
        if (schemaRank == null) return null;
        return {
          table,
          rank: schemaRank,
          insertText: quoteIdentifierIfNeeded(label, databaseType),
          documentation: fullName,
        };
      }
      if (rank == null) return null;

      const insertText =
        context.schemaPrefix != null
          ? quoteIdentifierIfNeeded(label, databaseType)
          : quoteIdentifierIfNeeded(label, databaseType);

      return {
        table,
        rank,
        insertText,
        documentation: fullName,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c != null)
    .sort((a, b) => {
      const rankDiff = compareRank(a.rank, b.rank);
      if (rankDiff !== 0) return rankDiff;

      const aDefault =
        (a.table.schema ?? defaultSchema) === defaultSchema ||
        referenced.has(tableKey(a.table.schema, a.table.name));
      const bDefault =
        (b.table.schema ?? defaultSchema) === defaultSchema ||
        referenced.has(tableKey(b.table.schema, b.table.name));
      if (aDefault !== bDefault) return aDefault ? -1 : 1;

      return a.table.name.localeCompare(b.table.name);
    })
    .slice(0, MAX_TABLE_COMPLETIONS);

  return candidates.map(({ table, insertText, documentation }) => ({
    label: table.name,
    type: "class",
    detail: "Table",
    info: documentation,
    apply: insertText,
  }));
}

function resolveColumnsForContext(
  schema: SqlCompletionSchema,
  sql: string,
  context: Extract<CompletionContext, { type: "column" }>,
): Array<{ table: CompletionSchemaTable; column: CompletionSchemaTable["columns"][number] }> {
  const { tables } = schema;
  const aliases = extractSimpleTableAliases(sql);
  const results: Array<{
    table: CompletionSchemaTable;
    column: CompletionSchemaTable["columns"][number];
  }> = [];

  const addTableColumns = (tableRef: { schema?: string; table: string }) => {
    const table = findTable(tables, tableRef.schema, tableRef.table);
    if (!table) return;
    for (const column of table.columns) {
      results.push({ table, column });
    }
  };

  if (context.tableOrAlias) {
    const aliasEntry = aliases[context.tableOrAlias];
    if (aliasEntry) {
      addTableColumns(aliasEntry);
      return results;
    }

    const directTable = findTable(tables, undefined, context.tableOrAlias);
    if (directTable) {
      addTableColumns({ schema: directTable.schema, table: directTable.name });
      return results;
    }

    return [];
  }

  const referenced = extractReferencedTables(sql);
  if (referenced.length === 1) {
    addTableColumns(referenced[0]!);
    return results;
  }

  if (referenced.length > 1) {
    for (const ref of referenced) {
      addTableColumns(ref);
    }
    return results;
  }

  for (const table of tables) {
    for (const column of table.columns) {
      results.push({ table, column });
    }
  }

  return results;
}

function buildColumnCompletions(
  schema: SqlCompletionSchema,
  sql: string,
  context: Extract<CompletionContext, { type: "column" }>,
): Completion[] {
  const { databaseType } = schema;
  const referencedCount = extractReferencedTables(sql).length;
  const multipleTables = referencedCount > 1;

  const candidates = resolveColumnsForContext(schema, sql, context)
    .map(({ table, column }) => {
      const rank = matchRank(context.prefix, column.name);
      if (rank == null) return null;

      const tableLabel = table.schema ? `${table.schema}.${table.name}` : table.name;
      const detailParts = [formatColumnDetail(column)];
      if (multipleTables || !context.tableOrAlias) {
        detailParts.push(tableLabel);
      }

      return {
        rank,
        column,
        table,
        completion: {
          label: column.name,
          type: "property",
          detail: detailParts.filter(Boolean).join(" · "),
          info: `${tableLabel}.${column.name}`,
          apply: quoteIdentifierIfNeeded(column.name, databaseType),
        } satisfies Completion,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c != null)
    .sort((a, b) => {
      const rankDiff = compareRank(a.rank, b.rank);
      if (rankDiff !== 0) return rankDiff;
      return a.column.name.localeCompare(b.column.name);
    })
    .slice(0, MAX_COLUMN_COMPLETIONS);

  return candidates.map((c) => c.completion);
}

export function buildSqlCompletions(input: {
  schema: SqlCompletionSchema | null;
  sql: string;
  cursorOffset: number;
  context: CompletionContext;
}): Completion[] {
  const { schema, sql, context } = input;
  if (!schema || schema.isLoading || schema.connectionId <= 0) {
    return [];
  }

  if (context.type === "table") {
    return buildTableCompletions(schema, sql, context);
  }

  if (context.type === "column") {
    return buildColumnCompletions(schema, sql, context);
  }

  return [];
}
