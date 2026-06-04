import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { AppView, SettingsSection } from "@/context/app-view";
import {
  readAppUrlFromLocation,
  resolveWorkspaceByProjectParam,
  workspaceToProjectParam,
  writeAppUrl,
  type AppUrlSnapshot,
} from "@/lib/app-url";
import type { Workspace } from "@/lib/api/types";

type AppUrlContextValue = {
  snapshot: AppUrlSnapshot;
  /** Increments on browser back/forward (popstate). */
  historyEpoch: number;
  setProjectFilter: (workspace: Workspace | null) => void;
  setActiveScriptId: (id: number | null) => void;
  setActiveConnectionId: (id: number | null) => void;
  syncAppView: (view: AppView, section?: SettingsSection) => void;
  renameProjectParam: (fromName: string, toName: string) => void;
};

const AppUrlContext = createContext<AppUrlContextValue | null>(null);

export function AppUrlProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<AppUrlSnapshot>(() => readAppUrlFromLocation());
  const [historyEpoch, setHistoryEpoch] = useState(0);

  useEffect(() => {
    const onPopState = () => {
      setSnapshot(readAppUrlFromLocation());
      setHistoryEpoch((n) => n + 1);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setProjectFilter = useCallback((workspace: Workspace | null) => {
    const project = workspace ? workspaceToProjectParam(workspace) : null;
    writeAppUrl({ project });
    setSnapshot((s) => ({ ...s, project }));
  }, []);

  const setActiveScriptId = useCallback((id: number | null) => {
    if (id != null) {
      writeAppUrl({ scriptId: id, view: "workspace", settingsSection: null });
      setSnapshot((s) => ({
        ...s,
        scriptId: id,
        view: "workspace",
        settingsSection: null,
      }));
      return;
    }
    writeAppUrl({ scriptId: id });
    setSnapshot((s) => ({ ...s, scriptId: id }));
  }, []);

  const setActiveConnectionId = useCallback((id: number | null) => {
    writeAppUrl({ connectionId: id });
    setSnapshot((s) => ({ ...s, connectionId: id }));
  }, []);

  const syncAppView = useCallback((view: AppView, section: SettingsSection = "guide") => {
    writeAppUrl({
      view: view === "settings" ? "settings" : "workspace",
      settingsSection: view === "settings" ? section : null,
    });
    setSnapshot((s) => ({
      ...s,
      view: view === "settings" ? "settings" : "workspace",
      settingsSection: view === "settings" ? section : null,
    }));
  }, []);

  const renameProjectParam = useCallback((fromName: string, toName: string) => {
    setSnapshot((s) => {
      if (s.project?.toLowerCase() !== fromName.toLowerCase()) return s;
      writeAppUrl({ project: toName });
      return { ...s, project: toName };
    });
  }, []);

  const value = useMemo(
    () => ({
      snapshot,
      historyEpoch,
      setProjectFilter,
      setActiveScriptId,
      setActiveConnectionId,
      syncAppView,
      renameProjectParam,
    }),
    [
      snapshot,
      historyEpoch,
      setProjectFilter,
      setActiveScriptId,
      setActiveConnectionId,
      syncAppView,
      renameProjectParam,
    ],
  );

  return <AppUrlContext.Provider value={value}>{children}</AppUrlContext.Provider>;
}

export function useAppUrl() {
  const ctx = useContext(AppUrlContext);
  if (!ctx) throw new Error("useAppUrl must be used within AppUrlProvider");
  return ctx;
}

export function useProjectWorkspaceId(workspaces: Workspace[]): number | null {
  const { snapshot } = useAppUrl();
  return useMemo(() => {
    if (!snapshot.project) return null;
    return resolveWorkspaceByProjectParam(snapshot.project, workspaces)?.id ?? null;
  }, [snapshot.project, workspaces]);
}
