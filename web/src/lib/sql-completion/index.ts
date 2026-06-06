export { extractReferencedTables, extractSimpleTableAliases } from "./aliases";
export { getCompletionReplaceRange, getSqlCompletionContext } from "./context";
export {
  createSqlCompletionExtension,
  getSqlDialect,
  reconfigureSqlCompletion,
  sqlCompletionCompartment,
} from "./codemirror";
export { needsIdentifierQuoting, quoteIdentifierIfNeeded } from "./identifier";
export { buildSqlCompletions } from "./suggestions";
export { useSqlCompletionSchema } from "./use-sql-completion-schema";
export type {
  CompletionContext,
  CompletionSchemaColumn,
  CompletionSchemaTable,
  DatabaseType,
  SqlCompletionSchema,
  TableAliasMap,
} from "./types";
export { MAX_COLUMN_COMPLETIONS, MAX_TABLE_COMPLETIONS } from "./types";
