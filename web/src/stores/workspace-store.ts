import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { QueryResult } from "@/lib/api/types";

export type WorkspaceEnv = "Development" | "Staging" | "Production";
export type ResultsView = "results" | "json";

export type SelectedConnection = {
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
  resultsView: ResultsView;
  queryHistory: QueryHistoryEntry[];
  setHasHydrated: (v: boolean) => void;
  setEnv: (env: WorkspaceEnv) => void;
  setSelectedConnection: (conn: SelectedConnection | null) => void;
  setLastResult: (result: QueryResult | null) => void;
  setLastQueryError: (message: string | null) => void;
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

      setLastResult: (result) => set({ lastResult: result, lastQueryError: null }),
      setLastQueryError: (message) => set({ lastQueryError: message, lastResult: null }),
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
