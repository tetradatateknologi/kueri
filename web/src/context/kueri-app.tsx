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
import { EditScriptDialog, type EditScriptFormValues } from "@/components/kueri/EditScriptDialog";
import { RenameDialog } from "@/components/kueri/RenameDialog";
import { SaveScriptDialog } from "@/components/kueri/SaveScriptDialog";
import { ApiError } from "@/lib/api/http";
import { getMe } from "@/lib/api/me";
import {
  createScript,
  getScript,
  listScripts,
  setScriptFavorite,
  updateScript,
} from "@/lib/api/scripts";
import { getFavoriteScripts } from "@/lib/favorite-scripts";
import { showSaveScriptToast, showSuccess, showValidationError } from "@/lib/toasts";
import type { Script, User, Workspace } from "@/lib/api/types";
import {
  isReservedScriptTitle,
  stripScriptTitleExtension,
  toScriptTitle,
} from "@/lib/script-title";
import { listWorkspaces } from "@/lib/api/workspaces";
import { useAppUrl } from "@/context/app-url";
import {
  buildOpenedTabs,
  createTempScriptTab,
  isScriptDirty,
  isTempTabDirty,
  isTempTabId,
  resolveNextActiveTabId,
  scriptIdFromTabId,
  tabIdFromScriptId,
  type EditorTab,
  type TempScriptTab,
} from "@/lib/editor-tabs";
import { useWorkspaceStore } from "@/stores/workspace-store";

type EditScriptTarget = { id: number; title: string; tags: string[] };
type RenameScriptTarget = { id: number; title: string; tags: string[] };
type EditTempTabTarget = { tabId: string; title: string };
type SaveScriptTarget = { tabId: string; title: string; workspaceId: number | null };

type KueriAppContextValue = {
  me: User | undefined;
  workspaces: Workspace[];
  scripts: Script[];
  favoriteScripts: Script[];
  isLoading: boolean;
  isTogglingFavorite: boolean;
  error: Error | null;
  openTabIds: string[];
  openedTabs: EditorTab[];
  activeTabId: string | null;
  activeScriptId: number | null;
  activeScript: Script | undefined;
  activeTab: EditorTab | undefined;
  draftSql: string;
  setDraftSql: (sql: string) => void;
  openScript: (id: number) => void;
  closeTab: (tabId: string) => void;
  isTabDirty: (tabId: string) => boolean;
  isScriptDirty: (id: number) => boolean;
  setActiveTabId: (tabId: string) => void;
  saveActiveScript: () => Promise<boolean>;
  saveTab: (tabId: string, options?: { closeAfterSave?: boolean }) => Promise<boolean>;
  isSaving: boolean;
  refetchAll: () => void;
  createNewScript: (workspaceId?: number) => void;
  openEditScript: (id: number) => void;
  openEditTempTab: (tabId: string) => void;
  openRenameScript: (id: number) => void;
  toggleFavorite: (id: number) => void;
};

const KueriAppContext = createContext<KueriAppContextValue | null>(null);

export function KueriAppProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { setActiveScriptId: setUrlScriptId } = useAppUrl();
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [activeTabId, setActiveTabIdState] = useState<string | null>(null);
  const [draftSql, setDraftSqlState] = useState("");
  const draftByScriptIdRef = useRef<Record<number, string>>({});
  const tempTabsRef = useRef<Record<string, TempScriptTab>>({});
  const [tempTabsVersion, setTempTabsVersion] = useState(0);
  const bumpTempTabs = useCallback(() => setTempTabsVersion((n) => n + 1), []);
  const [editScriptTarget, setEditScriptTarget] = useState<EditScriptTarget | null>(null);
  const [editTempTabTarget, setEditTempTabTarget] = useState<EditTempTabTarget | null>(null);
  const [renameScriptTarget, setRenameScriptTarget] = useState<RenameScriptTarget | null>(null);
  const [saveScriptTarget, setSaveScriptTarget] = useState<SaveScriptTarget | null>(null);
  const closeAfterSaveTabIdRef = useRef<string | null>(null);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: getMe });
  const workspacesQuery = useQuery({ queryKey: ["workspaces"], queryFn: listWorkspaces });
  const scriptsQuery = useQuery({ queryKey: ["scripts"], queryFn: listScripts });

  const activeScriptId = useMemo(() => {
    if (activeTabId == null) return null;
    return scriptIdFromTabId(activeTabId);
  }, [activeTabId]);

  const activeScriptQuery = useQuery({
    queryKey: ["script", activeScriptId],
    queryFn: () => getScript(activeScriptId!),
    enabled: activeScriptId != null,
  });

  const persistDraftForScript = useCallback((scriptId: number, sql: string) => {
    draftByScriptIdRef.current[scriptId] = sql;
  }, []);

  const persistTempTabSql = useCallback(
    (tabId: string, sql: string) => {
      const temp = tempTabsRef.current[tabId];
      if (!temp) return;
      tempTabsRef.current[tabId] = {
        ...temp,
        sql,
        isDirty: sql !== temp.lastSavedContent,
      };
      bumpTempTabs();
    },
    [bumpTempTabs],
  );

  const setDraftSql = useCallback(
    (sql: string) => {
      setDraftSqlState(sql);
      if (activeTabId == null) return;
      if (isTempTabId(activeTabId)) {
        persistTempTabSql(activeTabId, sql);
        return;
      }
      const scriptId = scriptIdFromTabId(activeTabId);
      if (scriptId != null) {
        persistDraftForScript(scriptId, sql);
      }
    },
    [activeTabId, persistDraftForScript, persistTempTabSql],
  );

  const loadDraftForTab = useCallback(
    (tabId: string) => {
      if (isTempTabId(tabId)) {
        const temp = tempTabsRef.current[tabId];
        setDraftSqlState(temp?.sql ?? "");
        return;
      }
      const scriptId = scriptIdFromTabId(tabId);
      if (scriptId == null) {
        setDraftSqlState("");
        return;
      }
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

  const switchActiveTab = useCallback(
    (tabId: string) => {
      if (activeTabId != null) {
        if (isTempTabId(activeTabId)) {
          persistTempTabSql(activeTabId, draftSql);
        } else {
          const scriptId = scriptIdFromTabId(activeTabId);
          if (scriptId != null) {
            persistDraftForScript(scriptId, draftSql);
          }
        }
      }
      setActiveTabIdState(tabId);
      const scriptId = scriptIdFromTabId(tabId);
      setUrlScriptId(scriptId);
      loadDraftForTab(tabId);
    },
    [
      activeTabId,
      draftSql,
      loadDraftForTab,
      persistDraftForScript,
      persistTempTabSql,
      setUrlScriptId,
    ],
  );

  const saveMutation = useMutation({
    mutationFn: () => updateScript(activeScriptId!, { sql_text: draftSql }),
    onSuccess: (script) => {
      queryClient.setQueryData(["script", script.id], script);
      persistDraftForScript(script.id, script.sql_text);
      void queryClient.invalidateQueries({ queryKey: ["scripts"] });
    },
  });

  const createScriptMutation = useMutation({
    mutationFn: (input: { workspaceId: number; title: string; sql: string }) =>
      createScript({
        workspace_id: input.workspaceId,
        title: input.title,
        sql_text: input.sql,
      }),
    onSuccess: (script) => {
      queryClient.setQueryData(["script", script.id], script);
      void queryClient.invalidateQueries({ queryKey: ["scripts"] });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, favorite }: { id: number; favorite: boolean }) =>
      setScriptFavorite(id, favorite),
    onMutate: async ({ id, favorite }) => {
      await queryClient.cancelQueries({ queryKey: ["scripts"] });
      const prev = queryClient.getQueryData<Script[]>(["scripts"]);
      queryClient.setQueryData<Script[]>(["scripts"], (old) =>
        (old ?? []).map((s) =>
          s.id === id ? { ...s, is_favorite: favorite, favorite_sort: favorite ? 999 : null } : s,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["scripts"], ctx.prev);
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Request failed";
      showValidationError(message);
    },
    onSuccess: (script) => {
      queryClient.setQueryData<Script[]>(["scripts"], (old) =>
        (old ?? []).map((s) => (s.id === script.id ? script : s)),
      );
      queryClient.setQueryData(["script", script.id], script);
      showSuccess(
        script.is_favorite
          ? `Added "${script.title}" to favorites`
          : `Removed "${script.title}" from favorites`,
      );
    },
  });

  const renameScriptMutation = useMutation({
    mutationFn: async (target: RenameScriptTarget & { title: string }) =>
      updateScript(target.id, { title: target.title, tags: target.tags }),
    onSuccess: async (script, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["scripts"] });
      queryClient.setQueryData(["script", variables.id], script);
      showSuccess(`Renamed to "${script.title}"`);
      setRenameScriptTarget(null);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Request failed";
      showValidationError(message);
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
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Request failed";
      showValidationError(message);
    },
  });

  const scripts = scriptsQuery.data ?? [];
  const workspaces = workspacesQuery.data ?? [];
  const favoriteScripts = useMemo(() => getFavoriteScripts(scripts), [scripts]);

  const openedTabs = useMemo(
    () =>
      buildOpenedTabs(
        openTabIds,
        scripts,
        workspaces,
        draftByScriptIdRef.current,
        tempTabsRef.current,
      ),
    [openTabIds, scripts, workspaces, draftSql, tempTabsVersion],
  );

  const activeTab = useMemo(
    () => openedTabs.find((tab) => tab.tabId === activeTabId),
    [openedTabs, activeTabId],
  );

  const checkTabDirty = useCallback(
    (tabId: string) => {
      if (isTempTabId(tabId)) {
        const temp = tempTabsRef.current[tabId];
        return temp ? isTempTabDirty(temp) : false;
      }
      const scriptId = scriptIdFromTabId(tabId);
      if (scriptId == null) return false;
      return isScriptDirty(scriptId, draftByScriptIdRef.current, scripts);
    },
    [scripts, draftSql, tempTabsVersion],
  );

  const checkScriptDirty = useCallback(
    (id: number) => isScriptDirty(id, draftByScriptIdRef.current, scripts),
    [scripts, draftSql],
  );

  const toggleFavorite = useCallback(
    (id: number) => {
      const script = scripts.find((s) => s.id === id);
      if (!script || favoriteMutation.isPending) return;
      favoriteMutation.mutate({ id, favorite: !script.is_favorite });
    },
    [scripts, favoriteMutation],
  );

  const resolveScript = useCallback(
    (id: number) => {
      const fromList = scripts.find((s) => s.id === id);
      const fromActive = activeScriptQuery.data?.id === id ? activeScriptQuery.data : undefined;
      return fromList ?? fromActive;
    },
    [scripts, activeScriptQuery.data],
  );

  const openEditScript = useCallback(
    (id: number) => {
      const script = resolveScript(id);
      if (!script) return;
      setRenameScriptTarget(null);
      setEditTempTabTarget(null);
      setEditScriptTarget({
        id: script.id,
        title: script.title,
        tags: script.tags.map((t) => t.name),
      });
    },
    [resolveScript],
  );

  const openEditTempTab = useCallback((tabId: string) => {
    const temp = tempTabsRef.current[tabId];
    if (!temp) return;
    setEditScriptTarget(null);
    setRenameScriptTarget(null);
    setEditTempTabTarget({ tabId, title: temp.title });
  }, []);

  const openRenameScript = useCallback(
    (id: number) => {
      const script = resolveScript(id);
      if (!script) return;
      setEditScriptTarget(null);
      setEditTempTabTarget(null);
      setRenameScriptTarget({
        id: script.id,
        title: script.title,
        tags: script.tags.map((t) => t.name),
      });
    },
    [resolveScript],
  );

  const openScript = useCallback(
    (id: number) => {
      const tabId = tabIdFromScriptId(id);
      setOpenTabIds((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));
      switchActiveTab(tabId);
    },
    [switchActiveTab],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      if (isTempTabId(tabId)) {
        delete tempTabsRef.current[tabId];
        bumpTempTabs();
      } else {
        const scriptId = scriptIdFromTabId(tabId);
        if (scriptId != null) {
          delete draftByScriptIdRef.current[scriptId];
        }
      }

      setOpenTabIds((prev) => {
        const next = prev.filter((id) => id !== tabId);
        if (activeTabId === tabId) {
          const nextActive = resolveNextActiveTabId(prev, tabId);
          setActiveTabIdState(nextActive);
          setUrlScriptId(nextActive != null ? scriptIdFromTabId(nextActive) : null);
          if (nextActive != null) {
            loadDraftForTab(nextActive);
          } else {
            setDraftSqlState("");
          }
        }
        return next;
      });
    },
    [activeTabId, bumpTempTabs, loadDraftForTab, setUrlScriptId],
  );

  const promoteTempTabToPersisted = useCallback(
    (tabId: string, script: Script) => {
      delete tempTabsRef.current[tabId];
      bumpTempTabs();
      const persistedTabId = tabIdFromScriptId(script.id);
      draftByScriptIdRef.current[script.id] = script.sql_text;

      setOpenTabIds((prev) => prev.map((id) => (id === tabId ? persistedTabId : id)));
      if (activeTabId === tabId) {
        setActiveTabIdState(persistedTabId);
        setUrlScriptId(script.id);
        setDraftSqlState(script.sql_text);
      }
    },
    [activeTabId, bumpTempTabs, setUrlScriptId],
  );

  const saveTempTab = useCallback(
    async (tabId: string, values: { title: string; workspaceId: number }) => {
      const temp = tempTabsRef.current[tabId];
      if (!temp) return false;

      try {
        const script = await createScriptMutation.mutateAsync({
          workspaceId: values.workspaceId,
          title: values.title,
          sql: temp.sql,
        });
        promoteTempTabToPersisted(tabId, script);
        showSaveScriptToast({ title: script.title });
        return true;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to save script";
        showValidationError(message || "Failed to save script. Please try again.");
        return false;
      }
    },
    [createScriptMutation, promoteTempTabToPersisted],
  );

  const savePersistedTab = useCallback(
    async (tabId: string): Promise<boolean> => {
      const scriptId = scriptIdFromTabId(tabId);
      if (scriptId == null) return false;

      const sql = isTempTabId(tabId)
        ? tempTabsRef.current[tabId]?.sql
        : (draftByScriptIdRef.current[scriptId] ??
          scripts.find((s) => s.id === scriptId)?.sql_text ??
          "");

      if (activeTabId !== tabId) {
        switchActiveTab(tabId);
      }

      try {
        const script = await updateScript(scriptId, { sql_text: sql ?? "" });
        queryClient.setQueryData(["script", script.id], script);
        persistDraftForScript(script.id, script.sql_text);
        await queryClient.invalidateQueries({ queryKey: ["scripts"] });
        return true;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to save script";
        showValidationError(message || "Failed to save script. Please try again.");
        return false;
      }
    },
    [activeTabId, persistDraftForScript, queryClient, scripts, switchActiveTab],
  );

  const openSaveDialogForTab = useCallback(
    (tabId: string, options?: { closeAfterSave?: boolean }) => {
      const temp = tempTabsRef.current[tabId];
      const tab = openedTabs.find((t) => t.tabId === tabId);
      if (!tab && !temp) return;

      closeAfterSaveTabIdRef.current = options?.closeAfterSave ? tabId : null;
      setSaveScriptTarget({
        tabId,
        title: tab?.scriptName ?? temp?.title ?? "Untitled.sql",
        workspaceId: tab?.projectId ?? temp?.workspaceId ?? null,
      });
    },
    [openedTabs],
  );

  const saveTab = useCallback(
    async (tabId: string, options?: { closeAfterSave?: boolean }): Promise<boolean> => {
      const tab = openedTabs.find((t) => t.tabId === tabId);
      if (!tab) return false;

      if (!tab.isPersisted) {
        openSaveDialogForTab(tabId, options);
        return false;
      }

      const saved = await savePersistedTab(tabId);
      if (saved && options?.closeAfterSave) {
        closeTab(tabId);
      }
      return saved;
    },
    [closeTab, openedTabs, openSaveDialogForTab, savePersistedTab],
  );

  const saveActiveScript = useCallback(async (): Promise<boolean> => {
    if (activeTabId == null) return false;
    return saveTab(activeTabId);
  }, [activeTabId, saveTab]);

  const refetchAll = useCallback(() => {
    void meQuery.refetch();
    void workspacesQuery.refetch();
    void scriptsQuery.refetch();
  }, [meQuery, workspacesQuery, scriptsQuery]);

  const selectedConnection = useWorkspaceStore((s) => s.selectedConnection);

  const createNewScript = useCallback(
    (workspaceId?: number) => {
      const allWorkspaces = workspacesQuery.data;
      if (!allWorkspaces?.length) return;

      const wsId =
        workspaceId ??
        (selectedConnection?.projectId ? Number(selectedConnection.projectId) : undefined) ??
        allWorkspaces[0].id;

      const ws = allWorkspaces.find((w) => w.id === wsId) ?? allWorkspaces[0];
      const existingTempTabs = Object.values(tempTabsRef.current);
      const temp = createTempScriptTab({
        workspaceId: ws.id,
        workspaceName: ws.name,
        connectionId:
          selectedConnection?.connectionId != null ? String(selectedConnection.connectionId) : null,
        existingTempTabs,
      });

      tempTabsRef.current[temp.tempId] = temp;
      bumpTempTabs();
      setOpenTabIds((prev) => [...prev, temp.tempId]);
      switchActiveTab(temp.tempId);
    },
    [
      workspacesQuery.data,
      selectedConnection?.projectId,
      selectedConnection?.connectionId,
      bumpTempTabs,
      switchActiveTab,
    ],
  );

  const isLoading = meQuery.isLoading || workspacesQuery.isLoading || scriptsQuery.isLoading;
  const error = (meQuery.error ?? workspacesQuery.error ?? scriptsQuery.error) as Error | null;
  const isSaving = saveMutation.isPending || createScriptMutation.isPending;

  const value = useMemo<KueriAppContextValue>(
    () => ({
      me: meQuery.data,
      workspaces: workspacesQuery.data ?? [],
      scripts,
      favoriteScripts,
      isLoading,
      isTogglingFavorite: favoriteMutation.isPending,
      error,
      openTabIds,
      openedTabs,
      activeTabId,
      activeScriptId,
      activeScript: activeScriptQuery.data,
      activeTab,
      draftSql,
      setDraftSql,
      openScript,
      closeTab,
      isTabDirty: checkTabDirty,
      isScriptDirty: checkScriptDirty,
      setActiveTabId: switchActiveTab,
      saveActiveScript,
      saveTab,
      isSaving,
      refetchAll,
      createNewScript,
      openEditScript,
      openEditTempTab,
      openRenameScript,
      toggleFavorite,
    }),
    [
      meQuery.data,
      workspacesQuery.data,
      scripts,
      favoriteScripts,
      isLoading,
      favoriteMutation.isPending,
      error,
      openTabIds,
      openedTabs,
      activeTabId,
      activeScriptId,
      activeScriptQuery.data,
      activeTab,
      draftSql,
      openScript,
      closeTab,
      checkTabDirty,
      checkScriptDirty,
      switchActiveTab,
      saveActiveScript,
      saveTab,
      isSaving,
      refetchAll,
      createNewScript,
      openEditScript,
      openEditTempTab,
      openRenameScript,
      toggleFavorite,
    ],
  );

  return (
    <KueriAppContext.Provider value={value}>
      {children}
      {renameScriptTarget && (
        <RenameDialog
          open
          onOpenChange={(open) => {
            if (!open) setRenameScriptTarget(null);
          }}
          title="Rename script"
          description="Update the name shown in the sidebar and editor tabs."
          label="Script name"
          initialName={stripScriptTitleExtension(renameScriptTarget.title)}
          placeholder="my-query"
          isPending={renameScriptMutation.isPending}
          onSubmit={(name) => {
            if (!name) {
              showValidationError("Script name is required");
              return;
            }
            const title = toScriptTitle(name);
            if (isReservedScriptTitle(title)) {
              showValidationError("Choose a name other than untitled");
              return;
            }
            renameScriptMutation.mutate({ ...renameScriptTarget, title });
          }}
        />
      )}
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
      {editTempTabTarget && (
        <RenameDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditTempTabTarget(null);
          }}
          title="Rename script"
          description="Update the tab name. Save the script to persist it to a project."
          label="Script name"
          initialName={stripScriptTitleExtension(editTempTabTarget.title)}
          placeholder="my-query"
          onSubmit={(name) => {
            if (!name) {
              showValidationError("Script name is required");
              return;
            }
            const title = toScriptTitle(name);
            const temp = tempTabsRef.current[editTempTabTarget.tabId];
            if (!temp) return;
            tempTabsRef.current[editTempTabTarget.tabId] = {
              ...temp,
              title,
              isDirty: true,
            };
            bumpTempTabs();
            setEditTempTabTarget(null);
          }}
        />
      )}
      {saveScriptTarget && (
        <SaveScriptDialog
          open
          initialTitle={saveScriptTarget.title}
          initialWorkspaceId={saveScriptTarget.workspaceId}
          workspaces={workspaces}
          isPending={createScriptMutation.isPending}
          onOpenChange={(open) => {
            if (!open) setSaveScriptTarget(null);
          }}
          onSubmit={async (values) => {
            if (!values.title) {
              showValidationError("Script name is required");
              return;
            }
            if (isReservedScriptTitle(values.title)) {
              showValidationError("Choose a name other than untitled");
              return;
            }
            const saved = await saveTempTab(saveScriptTarget.tabId, values);
            if (saved) {
              const closeTabId = closeAfterSaveTabIdRef.current;
              closeAfterSaveTabIdRef.current = null;
              setSaveScriptTarget(null);
              if (closeTabId === saveScriptTarget.tabId) {
                closeTab(closeTabId);
              }
            }
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
