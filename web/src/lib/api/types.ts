export type ApiEnv = "development" | "staging" | "production";

export type User = {
  id: number;
  name: string;
  email: string;
  plan: string;
};

export type Connection = {
  id: number;
  name: string;
  environment: string;
  env_key: "dev" | "staging" | "prod";
  host: string;
  port: number;
  display_host: string;
  driver: string;
  database_name: string;
  username: string;
  ssl_mode: string;
};

export type Workspace = {
  id: number;
  name: string;
  connections: Connection[];
};

export type ScriptTag = {
  name: string;
  color: string;
};

export type Script = {
  id: number;
  workspace_id: number;
  title: string;
  sql_text: string;
  tags: ScriptTag[];
  is_favorite: boolean;
  favorite_sort?: number | null;
};

export type QueryRunResult = {
  row_count: number;
  duration_ms: number;
  columns: string[];
  rows: Record<string, unknown>[];
};

export type FilterOperator = "contains" | "equals" | "is_null" | "is_not_null";

export type ResultColumnFilter = {
  column: string;
  operator: FilterOperator;
  value?: string;
};

export type QueryResultColumn = {
  name: string;
  dataType?: string;
  filterable: boolean;
};

export type QueryFilteringInfo = {
  enabled: boolean;
  mode: "server" | "client" | "none";
  reason?: string | null;
  appliedFilters?: ResultColumnFilter[];
};

export type QueryResult = {
  columns: QueryResultColumn[];
  rows: unknown[][];
  rowCount: number;
  durationMs: number;
  cached: boolean;
  limit: number;
  offset: number;
  hasMore: boolean;
  autoLimitApplied: boolean;
  filtering: QueryFilteringInfo;
  loadingMore?: boolean;
  loadingFilter?: boolean;
};

export function queryResultColumnNames(columns: QueryResultColumn[]): string[] {
  return columns.map((c) => c.name);
}

export type ConnectionDriver = "postgres" | "mysql";

export type ConnectionInput = {
  name: string;
  environment: string;
  driver: ConnectionDriver;
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  ssl_mode: string;
};

export type ExecuteQueryInput = {
  sql: string;
  connection_id: number;
  limit?: number;
  offset?: number;
  filters?: ResultColumnFilter[];
};

export type HealthResponse = { status: string };
export type PingResponse = { message: string };

export { ApiError } from "./http";
