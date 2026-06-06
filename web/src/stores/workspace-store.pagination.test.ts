import { beforeEach, describe, expect, it } from "vitest";

import type { QueryResult } from "@/lib/api/types";
import { useWorkspaceStore } from "@/stores/workspace-store";

function makeResult(rows: unknown[][]): QueryResult {
  return {
    columns: [{ name: "id", filterable: true }],
    rows,
    rowCount: rows.length,
    durationMs: 10,
    cached: false,
    limit: 20,
    offset: 0,
    hasMore: true,
    autoLimitApplied: true,
    filtering: {
      enabled: true,
      mode: "server",
      appliedFilters: [],
    },
    loadingMore: false,
  };
}

describe("workspace store query pagination", () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      lastResult: null,
      lastQuerySql: null,
      lastQueryConnectionId: null,
      lastQueryError: null,
    });
  });

  it("resets pagination context when a new query result replaces previous state", () => {
    const store = useWorkspaceStore.getState();
    store.setLastQueryContext("SELECT * FROM users", 1);
    store.setLastResult(makeResult([[1]]));

    store.setLastResult(makeResult([[9]]));
    expect(useWorkspaceStore.getState().lastResult?.rows).toEqual([[9]]);
  });

  it("appends rows for infinite scroll", () => {
    const store = useWorkspaceStore.getState();
    store.setLastResult(makeResult([[1], [2]]));
    store.appendResultRows([[3], [4]], false);

    const result = useWorkspaceStore.getState().lastResult;
    expect(result?.rows).toEqual([[1], [2], [3], [4]]);
    expect(result?.rowCount).toBe(4);
    expect(result?.hasMore).toBe(false);
    expect(result?.loadingMore).toBe(false);
  });

  it("clears result state on query error", () => {
    const store = useWorkspaceStore.getState();
    store.setLastQueryContext("SELECT * FROM users", 1);
    store.setLastResult(makeResult([[1]]));
    store.setLastQueryError("boom");

    const state = useWorkspaceStore.getState();
    expect(state.lastResult).toBeNull();
    expect(state.lastQuerySql).toBeNull();
    expect(state.lastQueryConnectionId).toBeNull();
  });
});
