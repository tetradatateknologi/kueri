import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { QueryResult, ResultColumnFilter } from "@/lib/api/types";

export type WorkspaceEnv = "Development" | "Staging" | "Production";
export type ResultsView = "results" | "json";

export type SelectedConnection = {
  connectionId: number;
  projectId: string;
  projectName: string;
  env: "dev" | "staging" | "prod";
  label: string;
  host: string;
};

export type QueryHistoryEntry = {
  id: string;
  sql: string;
  env: WorkspaceEnv;
  ranAt: string;
  rowCount?: number;
  durationMs?: number;
};

type WorkspaceUiState = {
  _hasHydrated: boolean;
  env: WorkspaceEnv;
  selectedConnection: SelectedConnection | null;
  lastResult: QueryResult | null;
  lastQueryError: string | null;
  lastQuerySql: string | null;
  lastQueryConnectionId: number | null;
  resultFilters: ResultColumnFilter[];
  resultsView: ResultsView;
  queryHistory: QueryHistoryEntry[];
  setHasHydrated: (v: boolean) => void;
  setEnv: (env: WorkspaceEnv) => void;
  setSelectedConnection: (conn: SelectedConnection | null) => void;
  setLastResult: (result: QueryResult | null) => void;
  setLastQueryError: (message: string | null) => void;
  setLastQueryContext: (sql: string, connectionId: number) => void;
  setResultFilters: (filters: ResultColumnFilter[]) => void;
  clearResultFilters: () => void;
  appendResultRows: (rows: unknown[][], hasMore: boolean) => void;
  setResultLoadingMore: (loading: boolean) => void;
  setResultsView: (view: ResultsView) => void;
  pushHistory: (entry: Omit<QueryHistoryEntry, "id">) => void;
};

export const useWorkspaceStore = create<WorkspaceUiState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      env: "Staging",
      selectedConnection: null,
      lastResult: null,
      lastQueryError: null,
      lastQuerySql: null,
      lastQueryConnectionId: null,
      resultFilters: [],
      resultsView: "results",
      queryHistory: [],

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      setEnv: (env) => set({ env }),

      setSelectedConnection: (conn) => {
        if (!conn) {
          set({ selectedConnection: null });
          return;
        }
        const envMap: Record<SelectedConnection["env"], WorkspaceEnv> = {
          dev: "Development",
          staging: "Staging",
          prod: "Production",
        };
        set({ selectedConnection: conn, env: envMap[conn.env] });
      },

      setLastResult: (result) =>
        set((s) => ({
          lastResult: result,
          lastQueryError: null,
          ...(result === null
            ? { lastQuerySql: null, lastQueryConnectionId: null }
            : { lastQuerySql: s.lastQuerySql, lastQueryConnectionId: s.lastQueryConnectionId }),
        })),
      setLastQueryError: (message) =>
        set({
          lastQueryError: message,
          lastResult: null,
          lastQuerySql: null,
          lastQueryConnectionId: null,
        }),

      setLastQueryContext: (sql, connectionId) =>
        set({ lastQuerySql: sql, lastQueryConnectionId: connectionId }),

      setResultFilters: (filters) => set({ resultFilters: filters }),

      clearResultFilters: () => set({ resultFilters: [] }),

      appendResultRows: (rows, hasMore) =>
        set((s) => {
          if (!s.lastResult) return s;
          return {
            lastResult: {
              ...s.lastResult,
              rows: [...s.lastResult.rows, ...rows],
              rowCount: s.lastResult.rows.length + rows.length,
              hasMore,
              loadingMore: false,
            },
          };
        }),

      setResultLoadingMore: (loading) =>
        set((s) => {
          if (!s.lastResult) return s;
          return { lastResult: { ...s.lastResult, loadingMore: loading } };
        }),
      setResultsView: (view) => set({ resultsView: view }),

      pushHistory: (entry) => {
        const id = `h${Date.now()}`;
        set((s) => ({
          queryHistory: [{ ...entry, id }, ...s.queryHistory].slice(0, 10),
        }));
      },
    }),
    {
      name: "kueri-workspace-ui",
      partialize: (s) => ({
        env: s.env,
        selectedConnection: s.selectedConnection,
        queryHistory: s.queryHistory,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
