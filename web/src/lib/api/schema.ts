import { apiFetch } from "./http";

export type SchemaTableKind = "table" | "view";

export type SchemaTable = {
  name: string;
  kind: SchemaTableKind;
};

export type SchemaDatabase = {
  name: string;
  tables: SchemaTable[];
};

export type ConnectionSchemaOverview = {
  driver: string;
  schemas: SchemaDatabase[];
};

export type SchemaColumn = {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string | null;
};

export type TableColumnsResponse = {
  schema: string;
  table: string;
  columns: SchemaColumn[];
};

export function fetchConnectionSchema(connectionId: number) {
  return apiFetch<ConnectionSchemaOverview>(`/api/v1/connections/${connectionId}/schema`);
}

export function fetchTableColumns(connectionId: number, schema: string, table: string) {
  const params = new URLSearchParams({ schema, table });
  return apiFetch<TableColumnsResponse>(
    `/api/v1/connections/${connectionId}/schema/columns?${params}`,
  );
}
