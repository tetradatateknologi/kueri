import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import type { SchemaColumn, TableColumnsResponse } from "@/lib/api/schema";
import { fetchConnectionSchema, fetchTableColumns } from "@/lib/api/schema";

import { extractReferencedTables } from "./aliases";
import type { CompletionSchemaColumn, CompletionSchemaTable, SqlCompletionSchema } from "./types";

const SCHEMA_STALE_TIME = 120_000;

function toCompletionColumn(column: SchemaColumn): CompletionSchemaColumn {
  return {
    name: column.name,
    dataType: column.dataType,
    isPrimaryKey: column.isPrimaryKey,
    isNullable: column.isNullable,
  };
}

function readCachedColumns(
  queryClient: ReturnType<typeof useQueryClient>,
  connectionId: number,
): Map<string, CompletionSchemaColumn[]> {
  const cache = new Map<string, CompletionSchemaColumn[]>();
  const queries = queryClient.getQueriesData<TableColumnsResponse>({
    queryKey: ["schema-columns", connectionId],
  });

  for (const [key, data] of queries) {
    if (!data?.columns?.length) continue;
    const [, , schema, table] = key as [string, number, string, string];
    cache.set(`${schema}\0${table}`, data.columns.map(toCompletionColumn));
  }

  return cache;
}

export function useSqlCompletionSchema(
  connectionId: number | null | undefined,
  sql: string,
): SqlCompletionSchema | null {
  const queryClient = useQueryClient();
  const lastSqlRef = useRef(sql);
  lastSqlRef.current = sql;

  const schemaQuery = useQuery({
    queryKey: ["connection-schema", connectionId],
    queryFn: () => fetchConnectionSchema(connectionId!),
    enabled: connectionId != null && connectionId > 0,
    staleTime: SCHEMA_STALE_TIME,
  });

  const columnCacheVersion = queryClient
    .getQueryCache()
    .findAll({ queryKey: ["schema-columns", connectionId] })
    .map((q) => q.state.dataUpdatedAt)
    .join(",");

  const tables = useMemo((): CompletionSchemaTable[] => {
    if (!connectionId || !schemaQuery.data) return [];

    const columnCache = readCachedColumns(queryClient, connectionId);
    const result: CompletionSchemaTable[] = [];

    for (const schemaNode of schemaQuery.data.schemas) {
      for (const tableNode of schemaNode.tables) {
        result.push({
          schema: schemaNode.name,
          name: tableNode.name,
          columns: columnCache.get(`${schemaNode.name}\0${tableNode.name}`) ?? [],
        });
      }
    }

    return result;
  }, [connectionId, columnCacheVersion, queryClient, schemaQuery.data]);

  useEffect(() => {
    if (!connectionId || connectionId <= 0 || !schemaQuery.data) return;

    const referenced = extractReferencedTables(sql);
    const knownSchemas = new Map(
      schemaQuery.data.schemas.flatMap((schema) =>
        schema.tables.map((table) => [`${table.name.toLowerCase()}`, schema.name] as const),
      ),
    );

    for (const ref of referenced) {
      const schemaName =
        ref.schema ??
        knownSchemas.get(ref.table.toLowerCase()) ??
        schemaQuery.data.schemas[0]?.name;
      if (!schemaName) continue;

      void queryClient.prefetchQuery({
        queryKey: ["schema-columns", connectionId, schemaName, ref.table],
        queryFn: () => fetchTableColumns(connectionId, schemaName, ref.table),
        staleTime: SCHEMA_STALE_TIME,
      });
    }
  }, [connectionId, queryClient, schemaQuery.data, sql]);

  if (!connectionId || connectionId <= 0) {
    return null;
  }

  const defaultSchema = schemaQuery.data?.schemas[0]?.name;

  return {
    connectionId,
    databaseType: schemaQuery.data?.driver ?? "postgres",
    defaultSchema,
    tables,
    isLoading: schemaQuery.isLoading,
  };
}
