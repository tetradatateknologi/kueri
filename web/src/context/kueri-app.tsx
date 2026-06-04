import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getMe } from "@/lib/api/me";
import { createScript, getScript, listScripts, updateScript } from "@/lib/api/scripts";
import type { Script, User, Workspace } from "@/lib/api/types";
import { listWorkspaces } from "@/lib/api/workspaces";

type KueriAppContextValue = {
  me: User | undefined;
  workspaces: Workspace[];
  scripts: Script[];
  isLoading: boolean;
  error: Error | null;
  openScriptIds: number[];
  activeScriptId: number | null;
  activeScript: Script | undefined;
  draftSql: string;
  setDraftSql: (sql: string) => void;
  openScript: (id: number) => void;
  closeScript: (id: number) => void;
  setActiveScriptId: (id: number) => void;
  saveActiveScript: () => Promise<void>;
  isSaving: boolean;
  refetchAll: () => void;
  createNewScript: () => Promise<void>;
};

const KueriAppContext = createContext<KueriAppContextValue | null>(null);

export function KueriAppProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [openScriptIds, setOpenScriptIds] = useState<number[]>([]);
  const [activeScriptId, setActiveScriptId] = useState<number | null>(null);
  const [draftSql, setDraftSql] = useState("");

  const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });
  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: listWorkspaces });
  const scriptsQuery = useQuery({ queryKey: ["scripts"], queryFn: listScripts });

  const activeScriptQuery = useQuery({
    queryKey: ["script", activeScriptId],
    queryFn: () => getScript(activeScriptId!),
    enabled: activeScriptId != null,
  });

  useEffect(() => {
    if (activeScriptQuery.data) {
      setDraftSql(activeScriptQuery.data.sql_text);
    }
  }, [activeScriptQuery.data]);

  useEffect(() => {
    const scripts = scriptsQuery.data;
    if (!scripts?.length || openScriptIds.length > 0) return;
    const firstId = scripts[0].id;
    setOpenScriptIds([firstId]);
    setActiveScriptId(firstId);
  }, [scriptsQuery.data, openScriptIds.length]);

  const saveMutation = useMutation({
    mutationFn: () => updateScript(activeScriptId!, { sql_text: draftSql }),
    onSuccess: (script) => {
      queryClient.setQueryData(["script", script.id], script);
      void queryClient.invalidateQueries({ queryKey: ["scripts"] });
    },
  });

  const openScript = useCallback((id: number) => {
    setOpenScriptIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setActiveScriptId(id);
  }, []);

  const closeScript = useCallback(
    (id: number) => {
      setOpenScriptIds((prev) => {
        const next = prev.filter((x) => x !== id);
        if (activeScriptId === id) {
          setActiveScriptId(next[0] ?? null);
        }
        return next;
      });
    },
    [activeScriptId],
  );

  const refetchAll = useCallback(() => {
    void meQuery.refetch();
    void workspacesQuery.refetch();
    void scriptsQuery.refetch();
  }, [meQuery, workspacesQuery, scriptsQuery]);

  const createNewScript = useCallback(async () => {
    const ws = workspacesQuery.data?.[0];
    if (!ws) return;
    const script = await createScript({
      workspace_id: ws.id,
      title: "untitled.sql",
      sql_text: "SELECT 1;",
    });
    await queryClient.invalidateQueries({ queryKey: ["scripts"] });
    openScript(script.id);
  }, [workspacesQuery.data, queryClient, openScript]);

  const isLoading = meQuery.isLoading || workspacesQuery.isLoading || scriptsQuery.isLoading;
  const error = (meQuery.error ?? workspacesQuery.error ?? scriptsQuery.error) as Error | null;

  const value = useMemo<KueriAppContextValue>(
    () => ({
      me: meQuery.data,
      workspaces: workspacesQuery.data ?? [],
      scripts: scriptsQuery.data ?? [],
      isLoading,
      error,
      openScriptIds,
      activeScriptId,
      activeScript: activeScriptQuery.data,
      draftSql,
      setDraftSql,
      openScript,
      closeScript,
      setActiveScriptId,
      saveActiveScript: async () => {
        if (activeScriptId == null) return;
        await saveMutation.mutateAsync();
      },
      isSaving: saveMutation.isPending,
      refetchAll,
      createNewScript,
    }),
    [
      meQuery.data,
      workspacesQuery.data,
      scriptsQuery.data,
      isLoading,
      error,
      openScriptIds,
      activeScriptId,
      activeScriptQuery.data,
      draftSql,
      openScript,
      closeScript,
      saveMutation,
      refetchAll,
      createNewScript,
    ],
  );

  return <KueriAppContext.Provider value={value}>{children}</KueriAppContext.Provider>;
}

export function useKueriApp() {
  const ctx = useContext(KueriAppContext);
  if (!ctx) throw new Error("useKueriApp must be used within KueriAppProvider");
  return ctx;
}
