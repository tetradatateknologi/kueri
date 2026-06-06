import { apiFetch } from "./http";

export type ErdColumn = {
  name: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique?: boolean;
  defaultValue?: string | null;
};

export type ErdTable = {
  id: string;
  schema: string;
  name: string;
  columns: ErdColumn[];
};

export type ErdRelation = {
  id: string;
  sourceSchema: string;
  sourceTable: string;
  sourceColumn: string;
  targetSchema: string;
  targetTable: string;
  targetColumn: string;
  constraintName?: string | null;
  onUpdate?: string | null;
  onDelete?: string | null;
};

export type ErdMetadata = {
  connectionId: number;
  database: string;
  driver: string;
  schemas: string[];
  tables: ErdTable[];
  relations: ErdRelation[];
};

export function fetchConnectionErd(connectionId: number) {
  return apiFetch<ErdMetadata>(`/api/v1/connections/${connectionId}/erd`);
}
