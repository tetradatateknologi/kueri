import type { QueryResult, QueryResultColumn } from "@/lib/api/types";

export function defaultFilteringInfo(): QueryResult["filtering"] {
  return {
    enabled: false,
    mode: "none",
    reason: null,
    appliedFilters: [],
  };
}

export function normalizeQueryResultColumns(
  columns: QueryResultColumn[] | string[] | undefined,
): QueryResultColumn[] {
  if (!columns?.length) return [];
  if (typeof columns[0] === "string") {
    return (columns as string[]).map((name) => ({ name, filterable: false }));
  }
  return columns as QueryResultColumn[];
}
