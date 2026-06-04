import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, X, Plus, Download, Save, Clock, Loader2 } from "lucide-react";

import { ExportModal } from "@/components/kueri/ExportModal";
import { JsonResultsView } from "@/components/kueri/JsonResultsView";
import { QueryHistorySheet } from "@/components/kueri/QueryHistorySheet";
import { EditorEmptyState } from "@/components/kueri/EditorEmptyState";
import { EditorPane } from "@/components/kueri/EditorPane";
import { ResultsGrid } from "@/components/kueri/ResultsGrid";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppView } from "@/context/app-view";
import { useKueriApp } from "@/context/kueri-app";
import { useSelectConnection } from "@/context/select-connection";
import { useKueriHotkeys } from "@/hooks/use-kueri-hotkeys";
import { formatShortcut } from "@/lib/hotkeys";
import { ApiError } from "@/lib/api/http";
import { useExecuteQuery } from "@/lib/api/queries";
import { saveScript } from "@/lib/saved-scripts";
import {
  showQueryErrorToast,
  showQueryResultToast,
  showSaveScriptToast,
  showValidationError,
} from "@/lib/toasts";
import { cn } from "@/lib/utils";
import { useWorkspaceStore, type WorkspaceEnv } from "@/stores/workspace-store";

const envMeta: Record<WorkspaceEnv, { dot: string; ring: string }> = {
  Development: { dot: "bg-env-dev", ring: "ring-env-dev/40" },
  Staging: { dot: "bg-env-staging", ring: "ring-env-staging/40" },
  Production: { dot: "bg-env-prod", ring: "ring-env-prod/40" },
};

export function Workspace() {
  const {
    workspaces,
    scripts,
    openScriptIds,
    activeScriptId,
    activeScript,
    draftSql,
    setDraftSql,
    closeScript,
    setActiveScriptId,
    saveActiveScript,
    isSaving,
    isLoading,
    createNewScript,
    openEditScript,
  } = useKueriApp();

  const env = useWorkspaceStore((s) => s.env);
  const selectedConnection = useWorkspaceStore((s) => s.selectedConnection);
  const lastResult = useWorkspaceStore((s) => s.lastResult);
  const lastQueryError = useWorkspaceStore((s) => s.lastQueryError);
  const resultsView = useWorkspaceStore((s) => s.resultsView);
  const setLastResult = useWorkspaceStore((s) => s.setLastResult);
  const setLastQueryError = useWorkspaceStore((s) => s.setLastQueryError);
  const setResultsView = useWorkspaceStore((s) => s.setResultsView);
  const pushHistory = useWorkspaceStore((s) => s.pushHistory);

  const executeMutation = useExecuteQuery();

  const { selectConnection } = useSelectConnection();

  const [exportOpen, setExportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { openSettings } = useAppView();

  const openTabs = openScriptIds
    .map((id) => scripts.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s != null);

  const activeTitle = activeScript?.title ?? "untitled.sql";
  const hasOpenTab = openScriptIds.length > 0;

  useEffect(() => {
    if (openScriptIds.length === 0) {
      setLastResult(null);
      setLastQueryError(null);
    }
  }, [openScriptIds.length, setLastQueryError, setLastResult]);

  const runQuery = useCallback(() => {
    if (!hasOpenTab) return;
    const sql = draftSql.trim();
    if (!sql) {
      showValidationError("SQL is empty");
      return;
    }
    const connectionId = selectedConnection?.connectionId;
    if (!connectionId) {
      showValidationError("Select a database connection in the sidebar");
      return;
    }

    executeMutation.mutate(
      { sql, connection_id: connectionId },
      {
        onSuccess: (data) => {
          setLastResult(data);
          pushHistory({
            sql,
            env,
            ranAt: new Date().toISOString(),
            rowCount: data.rowCount,
            durationMs: data.durationMs,
          });
          showQueryResultToast({
            rowCount: data.rowCount,
            durationMs: data.durationMs,
            cached: data.cached,
          });
        },
        onError: (err) => {
          const message =
            err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Query failed";
          setLastQueryError(message);
          showQueryErrorToast(message);
        },
      },
    );
  }, [
    draftSql,
    selectedConnection?.connectionId,
    executeMutation,
    pushHistory,
    setLastQueryError,
    setLastResult,
    env,
    hasOpenTab,
  ]);

  const cycleConnection = useCallback(() => {
    if (!selectedConnection) return;
    const ws = workspaces.find((w) => String(w.id) === selectedConnection.projectId);
    if (!ws?.connections.length) return;
    const idx = ws.connections.findIndex((c) => c.id === selectedConnection.connectionId);
    const next = ws.connections[(idx + 1) % ws.connections.length];
    selectConnection({
      connectionId: next.id,
      projectId: String(ws.id),
      projectName: ws.name,
      env: next.env_key,
      label: next.name,
      host: next.display_host,
    });
  }, [workspaces, selectedConnection, selectConnection]);

  const focusSidebarSearch = useCallback(() => {
    document.getElementById("kueri-sidebar-search")?.focus();
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasOpenTab) return;
    if (activeScriptId == null) {
      saveScript({ title: activeTitle, sql: draftSql });
      showSaveScriptToast({ local: true });
      return;
    }
    try {
      await saveActiveScript();
      showSaveScriptToast({ title: activeTitle });
    } catch (err) {
      showQueryErrorToast(err instanceof Error ? err.message : "Save failed", "Save failed");
    }
  }, [hasOpenTab, activeScriptId, activeTitle, draftSql, saveActiveScript]);

  const hotkeyHandlers = useMemo(
    () => ({
      onRun: runQuery,
      onSave: () => void handleSave(),
      onNewTab: () => void createNewScript(),
      onCloseTab: () => {
        if (activeScriptId != null) closeScript(activeScriptId);
      },
      onEditScript: () => {
        if (activeScriptId != null) openEditScript(activeScriptId);
      },
      onHistory: () => setHistoryOpen(true),
      onExport: () => {
        if (lastResult) setExportOpen(true);
      },
      onFocusSidebarSearch: focusSidebarSearch,
      onCycleConnection: cycleConnection,
      onNextTab: () => {
        if (!openScriptIds.length || activeScriptId == null) return;
        const i = openScriptIds.indexOf(activeScriptId);
        const nextId = openScriptIds[(i + 1) % openScriptIds.length];
        setActiveScriptId(nextId);
      },
      onPrevTab: () => {
        if (!openScriptIds.length || activeScriptId == null) return;
        const i = openScriptIds.indexOf(activeScriptId);
        const prevId = openScriptIds[(i - 1 + openScriptIds.length) % openScriptIds.length];
        setActiveScriptId(prevId);
      },
      onSwitchTab: (index: number) => {
        const id = openScriptIds[index];
        if (id != null) setActiveScriptId(id);
      },
      onResultsView: (view: "results" | "json") => setResultsView(view),
      onShowShortcuts: () => openSettings("shortcuts"),
    }),
    [
      runQuery,
      activeScriptId,
      closeScript,
      createNewScript,
      openEditScript,
      openScriptIds,
      setActiveScriptId,
      lastResult,
      focusSidebarSearch,
      cycleConnection,
      setResultsView,
      handleSave,
      openSettings,
    ],
  );

  useKueriHotkeys(hotkeyHandlers);

  const metaLabel =
    lastResult != null
      ? `${lastResult.rowCount} rows • ${lastResult.durationMs} ms${lastResult.cached ? " • cached" : ""}`
      : executeMutation.isPending
        ? "Running…"
        : null;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col h-full min-h-0 min-w-0 p-4 gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="flex-1 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-1 flex-col h-full min-h-0 min-w-0">
        <div
          className="h-10 bg-sidebar border-b border-border flex items-end pl-1 pr-2 select-none gap-1"
          role="tablist"
          aria-label="SQL editor tabs"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center self-center shrink-0 pb-0.5">
                <SidebarTrigger className="size-8" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Toggle sidebar</p>
              <p className="text-[10px] text-muted-foreground font-mono">⌘B</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex items-end gap-px overflow-x-auto min-w-0 flex-1">
            {openTabs.map((t) => {
              const isActive = t.id === activeScriptId;
              return (
                <div
                  key={t.id}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => {
                    if (isActive) {
                      openEditScript(t.id);
                    } else {
                      setActiveScriptId(t.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (isActive) {
                        openEditScript(t.id);
                      } else {
                        setActiveScriptId(t.id);
                      }
                    }
                  }}
                  className={cn(
                    "group h-9 pl-3 pr-1.5 flex items-center gap-2 text-xs cursor-pointer border-t-2 transition-colors rounded-t-md outline-none focus-visible:ring-1 focus-visible:ring-electric",
                    isActive
                      ? "bg-surface-1 border-electric text-foreground"
                      : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-1/40",
                  )}
                >
                  <span className="font-mono">{t.title}</span>
                  <button
                    type="button"
                    aria-label={`Close ${t.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeScript(t.id);
                    }}
                    className="size-4 rounded hover:bg-border flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              aria-label="New tab"
              onClick={() => void createNewScript()}
              className="h-9 px-2 text-muted-foreground hover:text-electric transition-colors"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <div className="h-12 px-3 flex items-center gap-2 border-b border-border bg-background">
          <div
            className={cn(
              "flex items-center gap-2 px-3 h-8 rounded-md bg-surface-1 border border-border text-xs ring-1 ring-transparent",
              envMeta[env].ring,
            )}
            title="Environment follows the selected sidebar connection"
          >
            <span className={cn("size-2 rounded-full", envMeta[env].dot)} />
            <span className="text-muted-foreground">env:</span>
            <span className="font-mono">{env}</span>
          </div>

          {selectedConnection && (
            <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px]">
              {selectedConnection.label} · {selectedConnection.host}
            </span>
          )}

          <div className="h-5 w-px bg-border mx-1" />

          <button
            type="button"
            disabled={!hasOpenTab || isSaving}
            onClick={() => void handleSave()}
            className="flex items-center gap-1.5 px-2 h-8 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save
            <span className="text-[10px] opacity-60 font-mono">{formatShortcut("S")}</span>
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-2 h-8 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
          >
            <Clock className="size-3.5" /> History
            <span className="text-[10px] opacity-60 font-mono">{formatShortcut("H")}</span>
          </button>

          <div className="ml-auto flex items-center gap-2">
            {hasOpenTab && (
              <span className="text-[11px] text-muted-foreground font-mono">
                {draftSql.split("\n").length} lines
              </span>
            )}
            <button
              type="button"
              disabled={!hasOpenTab || executeMutation.isPending}
              onClick={runQuery}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-electric text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all glow-electric disabled:opacity-60"
            >
              {executeMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Play className="size-3.5 fill-current" />
              )}
              Run Query
              <span className="text-[10px] opacity-70 font-mono pl-1">{formatShortcut("Enter")}</span>
            </button>
            <button
              type="button"
              onClick={() => openSettings("shortcuts")}
              className="size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-1 text-xs font-mono"
              aria-label="Settings and keyboard shortcuts"
              title="Settings (?) — panduan & pintasan"
            >
              ?
            </button>
          </div>
        </div>

        <ResizablePanelGroup orientation="vertical" className="flex-1 min-h-0" id="kueri-editor-results">
          <ResizablePanel defaultSize={50} minSize={20}>
            {hasOpenTab ? (
              <EditorPane value={draftSql} onChange={setDraftSql} onRun={runQuery} />
            ) : (
              <EditorEmptyState onCreateScript={() => void createNewScript()} />
            )}
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={20}>
            <div className="h-full min-h-0 flex flex-col bg-background">
              <div className="h-10 px-3 border-b border-border flex items-center gap-2 bg-surface-1/40">
                <div className="flex items-center gap-1" role="tablist" aria-label="Result view">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={resultsView === "results"}
                    onClick={() => setResultsView("results")}
                    className={cn(
                      "px-2.5 h-7 text-xs rounded-md transition-colors",
                      resultsView === "results"
                        ? "bg-surface-1 border border-electric/40 text-electric font-medium"
                        : "text-muted-foreground hover:bg-surface-1",
                    )}
                  >
                    Results
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <button
                          type="button"
                          disabled
                          className="px-2.5 h-7 text-xs rounded-md text-muted-foreground/50 cursor-not-allowed"
                        >
                          Chart
                        </button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Coming soon</TooltipContent>
                  </Tooltip>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={resultsView === "json"}
                    onClick={() => setResultsView("json")}
                    className={cn(
                      "px-2.5 h-7 text-xs rounded-md transition-colors",
                      resultsView === "json"
                        ? "bg-surface-1 border border-electric/40 text-electric font-medium"
                        : "text-muted-foreground hover:bg-surface-1",
                    )}
                  >
                    JSON
                  </button>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {metaLabel && (
                    <span className="text-[11px] text-muted-foreground font-mono">{metaLabel}</span>
                  )}
                  <button
                    type="button"
                    disabled={!lastResult}
                    onClick={() => setExportOpen(true)}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-neon/10 border border-neon/40 text-neon text-xs font-medium hover:bg-neon/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download className="size-3.5" /> Smart Export
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0">
                {resultsView === "results" ? (
                  <ResultsGrid
                    result={lastResult}
                    isLoading={executeMutation.isPending}
                    error={lastQueryError}
                  />
                ) : (
                  <JsonResultsView result={lastResult} />
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        <ExportModal
          open={exportOpen}
          onOpenChange={setExportOpen}
          sql={draftSql}
          title={activeTitle}
        />
        <QueryHistorySheet
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          onPickSql={setDraftSql}
        />
      </div>
    </TooltipProvider>
  );
}
