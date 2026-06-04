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
};

export type QueryRunResult = {
  row_count: number;
  duration_ms: number;
  columns: string[];
  rows: Record<string, unknown>[];
};

export type QueryResult = {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  durationMs: number;
  cached: boolean;
};

export type ConnectionInput = {
  name: string;
  environment: string;
  driver?: string;
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
};

export type HealthResponse = { status: string };
export type PingResponse = { message: string };

export { ApiError } from "./http";
