export type DatabaseType = "postgres" | "mysql" | "sqlite" | string;

export type CompletionSchemaColumn = {
  name: string;
  dataType?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
};

export type CompletionSchemaTable = {
  schema?: string;
  name: string;
  columns: CompletionSchemaColumn[];
};

export type CompletionContext =
  | { type: "table"; prefix: string; schemaPrefix?: string }
  | { type: "column"; prefix: string; tableOrAlias?: string }
  | { type: "none" };

export type TableAliasMap = Record<
  string,
  {
    schema?: string;
    table: string;
  }
>;

export type SqlCompletionSchema = {
  connectionId: number;
  databaseType: DatabaseType;
  defaultSchema?: string;
  tables: CompletionSchemaTable[];
  isLoading: boolean;
};

export const MAX_TABLE_COMPLETIONS = 50;
export const MAX_COLUMN_COMPLETIONS = 100;
