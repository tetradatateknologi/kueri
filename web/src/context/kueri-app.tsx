import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EditScriptDialog,
  type EditScriptFormValues,
} from "@/components/kueri/EditScriptDialog";
import { ApiError } from "@/lib/api/http";
import { getMe } from "@/lib/api/me";
import { createScript, getScript, listScripts, updateScript } from "@/lib/api/scripts";
import { showSuccess, showValidationError } from "@/lib/toasts";
import type { Script, User, Workspace } from "@/lib/api/types";
import { generateNewScriptTitle, isReservedScriptTitle } from "@/lib/script-title";
import { listWorkspaces } from "@/lib/api/workspaces";
import { useWorkspaceStore } from "@/stores/workspace-store";

type EditScriptTarget = { id: number; title: string; tags: string[] };

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
  createNewScript: (workspaceId?: number) => Promise<void>;
  openEditScript: (id: number) => void;
};

const KueriAppContext = createContext<KueriAppContextValue | null>(null);

export function KueriAppProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [openScriptIds, setOpenScriptIds] = useState<number[]>([]);
  const [activeScriptId, setActiveScriptId] = useState<number | null>(null);
  const [draftSql, setDraftSqlState] = useState("");
  const draftByScriptIdRef = useRef<Record<number, string>>({});
  const [editScriptTarget, setEditScriptTarget] = useState<EditScriptTarget | null>(null);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });
  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: listWorkspaces });
  const scriptsQuery = useQuery({ queryKey: ["scripts"], queryFn: listScripts });

  const activeScriptQuery = useQuery({
    queryKey: ["script", activeScriptId],
    queryFn: () => getScript(activeScriptId!),
    enabled: activeScriptId != null,
  });

  const persistDraftForScript = useCallback((scriptId: number, sql: string) => {
    draftByScriptIdRef.current[scriptId] = sql;
  }, []);

  const setDraftSql = useCallback(
    (sql: string) => {
      setDraftSqlState(sql);
      if (activeScriptId != null) {
        persistDraftForScript(activeScriptId, sql);
      }
    },
    [activeScriptId, persistDraftForScript],
  );

  const loadDraftForScript = useCallback(
    (scriptId: number) => {
      const cached = draftByScriptIdRef.current[scriptId];
      if (cached !== undefined) {
        setDraftSqlState(cached);
        return;
      }
      const fromList = scriptsQuery.data?.find((s) => s.id === scriptId);
      if (fromList) {
        setDraftSqlState(fromList.sql_text);
        return;
      }
      setDraftSqlState("");
    },
    [scriptsQuery.data],
  );

  useEffect(() => {
    if (activeScriptId == null) return;
    if (draftByScriptIdRef.current[activeScriptId] !== undefined) return;
    if (activeScriptQuery.data?.id === activeScriptId) {
      setDraftSqlState(activeScriptQuery.data.sql_text);
    }
  }, [activeScriptId, activeScriptQuery.data]);

  const switchActiveScript = useCallback(
    (id: number) => {
      if (activeScriptId != null) {
        persistDraftForScript(activeScriptId, draftSql);
      }
      setActiveScriptId(id);
      loadDraftForScript(id);
    },
    [activeScriptId, draftSql, loadDraftForScript, persistDraftForScript],
  );

  useEffect(() => {
    const scripts = scriptsQuery.data;
    if (!scripts?.length || openScriptIds.length > 0) return;
    const firstId = scripts[0].id;
    setOpenScriptIds([firstId]);
    setActiveScriptId(firstId);
    loadDraftForScript(firstId);
  }, [scriptsQuery.data, openScriptIds.length, loadDraftForScript]);

  const saveMutation = useMutation({
    mutationFn: () => updateScript(activeScriptId!, { sql_text: draftSql }),
    onSuccess: (script) => {
      queryClient.setQueryData(["script", script.id], script);
      persistDraftForScript(script.id, script.sql_text);
      void queryClient.invalidateQueries({ queryKey: ["scripts"] });
    },
  });

  const editScriptMutation = useMutation({
    mutationFn: async (target: EditScriptTarget & EditScriptFormValues) =>
      updateScript(target.id, { title: target.title, tags: target.tags }),
    onSuccess: async (script, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["scripts"] });
      queryClient.setQueryData(["script", variables.id], script);
      showSuccess(`Updated "${script.title}"`);
      setEditScriptTarget(null);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Request failed";
      showValidationError(message);
    },
  });

  const scripts = scriptsQuery.data ?? [];

  const openEditScript = useCallback(
    (id: number) => {
      const fromList = scripts.find((s) => s.id === id);
      const fromActive = activeScriptQuery.data?.id === id ? activeScriptQuery.data : undefined;
      const script = fromList ?? fromActive;
      if (!script) return;
      setEditScriptTarget({
        id: script.id,
        title: script.title,
        tags: script.tags.map((t) => t.name),
      });
    },
    [scripts, activeScriptQuery.data],
  );

  const openScript = useCallback(
    (id: number) => {
      setOpenScriptIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      switchActiveScript(id);
    },
    [switchActiveScript],
  );

  const closeScript = useCallback(
    (id: number) => {
      delete draftByScriptIdRef.current[id];
      setOpenScriptIds((prev) => {
        const next = prev.filter((x) => x !== id);
        if (activeScriptId === id) {
          const nextActive = next[0] ?? null;
          setActiveScriptId(nextActive);
          if (nextActive != null) {
            loadDraftForScript(nextActive);
          } else {
            setDraftSqlState("");
          }
        }
        return next;
      });
    },
    [activeScriptId, loadDraftForScript],
  );

  const refetchAll = useCallback(() => {
    void meQuery.refetch();
    void workspacesQuery.refetch();
    void scriptsQuery.refetch();
  }, [meQuery, workspacesQuery, scriptsQuery]);

  const selectedConnection = useWorkspaceStore((s) => s.selectedConnection);

  const createNewScript = useCallback(
    async (workspaceId?: number) => {
      const workspaces = workspacesQuery.data;
      if (!workspaces?.length) return;

      const wsId =
        workspaceId ??
        (selectedConnection?.projectId ? Number(selectedConnection.projectId) : undefined) ??
        workspaces[0].id;

      const ws = workspaces.find((w) => w.id === wsId) ?? workspaces[0];
      const existing = scriptsQuery.data ?? [];
      const title = generateNewScriptTitle(existing.filter((s) => s.workspace_id === ws.id));

      try {
        const script = await createScript({
          workspace_id: ws.id,
          title,
          sql_text: "SELECT 1;",
        });
        await queryClient.invalidateQueries({ queryKey: ["scripts"] });
        queryClient.setQueryData(["script", script.id], script);
        draftByScriptIdRef.current[script.id] = script.sql_text;
        openScript(script.id);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to create script";
        showValidationError(message);
      }
    },
    [workspacesQuery.data, scriptsQuery.data, selectedConnection?.projectId, queryClient, openScript],
  );

  const isLoading = meQuery.isLoading || workspacesQuery.isLoading || scriptsQuery.isLoading;
  const error = (meQuery.error ?? workspacesQuery.error ?? scriptsQuery.error) as Error | null;

  const value = useMemo<KueriAppContextValue>(
    () => ({
      me: meQuery.data,
      workspaces: workspacesQuery.data ?? [],
      scripts,
      isLoading,
      error,
      openScriptIds,
      activeScriptId,
      activeScript: activeScriptQuery.data,
      draftSql,
      setDraftSql,
      openScript,
      closeScript,
      setActiveScriptId: switchActiveScript,
      saveActiveScript: async () => {
        if (activeScriptId == null) return;
        await saveMutation.mutateAsync();
      },
      isSaving: saveMutation.isPending,
      refetchAll,
      createNewScript,
      openEditScript,
    }),
    [
      meQuery.data,
      workspacesQuery.data,
      scripts,
      isLoading,
      error,
      openScriptIds,
      activeScriptId,
      activeScriptQuery.data,
      draftSql,
      openScript,
      closeScript,
      switchActiveScript,
      saveMutation,
      refetchAll,
      createNewScript,
      openEditScript,
    ],
  );

  return (
    <KueriAppContext.Provider value={value}>
      {children}
      {editScriptTarget && (
        <EditScriptDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditScriptTarget(null);
          }}
          initialTitle={editScriptTarget.title}
          initialTags={editScriptTarget.tags}
          isPending={editScriptMutation.isPending}
          onSubmit={(values) => {
            if (!values.title) {
              showValidationError("Script name is required");
              return;
            }
            if (isReservedScriptTitle(values.title)) {
              showValidationError("Choose a name other than untitled");
              return;
            }
            editScriptMutation.mutate({ ...editScriptTarget, ...values });
          }}
        />
      )}
    </KueriAppContext.Provider>
  );
}

export function useKueriApp() {
  const ctx = useContext(KueriAppContext);
  if (!ctx) throw new Error("useKueriApp must be used within KueriAppProvider");
  return ctx;
}
