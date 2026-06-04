import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Database,
  FileCode2,
  FolderGit2,
  Plus,
  Search,
  Settings,
} from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/kueri/ConfirmDeleteDialog";
import { FavoritesSection } from "@/components/kueri/FavoritesSection";
import { ScriptFavoriteButton } from "@/components/kueri/ScriptFavoriteButton";
import { CreateConnectionDialog } from "@/components/kueri/CreateConnectionDialog";
import { CreateWorkspaceDialog } from "@/components/kueri/CreateWorkspaceDialog";
import { RenameDialog } from "@/components/kueri/RenameDialog";
import { SidebarItemMenu } from "@/components/kueri/SidebarItemMenu";
import { SidebarSectionSkeleton } from "@/components/kueri/SidebarSectionSkeleton";
import {
  Sidebar as UiSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useAppView } from "@/context/app-view";
import { useKueriApp } from "@/context/kueri-app";
import { useSelectConnection } from "@/context/select-connection";
import { ApiError } from "@/lib/api/http";
import { deleteScript } from "@/lib/api/scripts";
import type { Script } from "@/lib/api/types";
import {
  deleteConnection,
  deleteWorkspace,
  updateWorkspace,
} from "@/lib/api/workspaces";
import { showSuccess, showValidationError } from "@/lib/toasts";
import { cn } from "@/lib/utils";
import {
  useWorkspaceStore,
  type SelectedConnection,
} from "@/stores/workspace-store";

const envDot: Record<string, string> = {
  dev: "bg-env-dev",
  staging: "bg-env-staging",
  prod: "bg-env-prod",
};

function Tag({ label, color }: { label: string; color: string }) {
  const styles: Record<string, string> = {
    electric: "bg-electric/10 text-electric border-electric/30",
    neon: "bg-neon/10 text-neon border-neon/30",
    danger: "bg-destructive/15 text-destructive border-destructive/40",
  };
  return (
    <span
      className={cn(
        "text-[10px] px-2 py-0.5 rounded-full border font-mono tracking-tight",
        styles[color] ?? styles.electric,
      )}
    >
      #{label}
    </span>
  );
}

type RenameTarget = { kind: "workspace"; id: number; name: string };

type DeleteTarget =
  | { kind: "workspace"; id: number; name: string }
  | { kind: "connection"; workspaceId: number; id: number; name: string }
  | { kind: "script"; id: number; name: string };

export function Sidebar() {
  const queryClient = useQueryClient();
  const {
    workspaces,
    scripts,
    favoriteScripts,
    isLoading,
    isTogglingFavorite,
    openScript,
    closeScript,
    createNewScript,
    openEditScript,
    toggleFavorite,
  } = useKueriApp();
  const hasHydrated = useWorkspaceStore((s) => s._hasHydrated);
  const selectedConnection = useWorkspaceStore((s) => s.selectedConnection);
  const setSelectedConnection = useWorkspaceStore((s) => s.setSelectedConnection);

  const [openProjects, setOpenProjects] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [connectionDialog, setConnectionDialog] = useState<{
    workspaceId: number;
    workspaceName: string;
  } | null>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const { selectConnection } = useSelectConnection();
  const { view, openWorkspace, openSettings } = useAppView();

  const handleMutationError = (err: unknown) => {
    const message =
      err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Request failed";
    showValidationError(message);
  };

  const renameMutation = useMutation({
    mutationFn: async (target: RenameTarget & { name: string }) =>
      updateWorkspace(target.id, { name: target.name }),
    onSuccess: async (ws, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      if (selectedConnection?.projectId === String(variables.id)) {
        setSelectedConnection({
          ...selectedConnection,
          projectName: ws.name,
        });
      }
      showSuccess(`Workspace renamed to "${ws.name}"`);
      setRenameTarget(null);
    },
    onError: handleMutationError,
  });

  const deleteMutation = useMutation({
    mutationFn: async (target: DeleteTarget) => {
      if (target.kind === "workspace") {
        return deleteWorkspace(target.id);
      }
      if (target.kind === "connection") {
        return deleteConnection(target.workspaceId, target.id);
      }
      return deleteScript(target.id);
    },
    onSuccess: async (_data, target) => {
      if (target.kind === "workspace") {
        await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        if (selectedConnection?.projectId === String(target.id)) {
          setSelectedConnection(null);
        }
        showSuccess(`Workspace "${target.name}" deleted`);
      } else if (target.kind === "connection") {
        await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        if (selectedConnection?.connectionId === target.id) {
          setSelectedConnection(null);
        }
        showSuccess(`Connection "${target.name}" deleted`);
      } else {
        await queryClient.invalidateQueries({ queryKey: ["scripts"] });
        queryClient.removeQueries({ queryKey: ["script", target.id] });
        closeScript(target.id);
        showSuccess(`Script "${target.name}" deleted`);
      }
      setDeleteTarget(null);
    },
    onError: handleMutationError,
  });

  const filteredWorkspaces = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return workspaces;
    return workspaces
      .map((ws) => ({
        ...ws,
        connections: ws.connections.filter(
          (c) =>
            ws.name.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q) ||
            c.display_host.toLowerCase().includes(q),
        ),
      }))
      .filter((ws) => {
        const hasMatchingScript = scripts.some(
          (s) =>
            s.workspace_id === ws.id &&
            (s.title.toLowerCase().includes(q) ||
              s.tags.some((t) => t.name.toLowerCase().includes(q))),
        );
        return ws.name.toLowerCase().includes(q) || ws.connections.length > 0 || hasMatchingScript;
      });
  }, [workspaces, scripts, search]);

  const scriptsByWorkspace = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<number, Script[]>();
    for (const ws of workspaces) {
      map.set(ws.id, []);
    }
    for (const s of scripts) {
      const list = map.get(s.workspace_id) ?? [];
      if (
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.tags.some((t) => t.name.toLowerCase().includes(q))
      ) {
        list.push(s);
        map.set(s.workspace_id, list);
      }
    }
    return map;
  }, [workspaces, scripts, search]);

  useEffect(() => {
    if (!hasHydrated || isLoading || workspaces.length === 0) return;
    if (selectedConnection?.connectionId) return;

    const ws = workspaces[0];
    const conn = ws.connections[0];
    if (!conn) return;

    selectConnection({
      connectionId: conn.id,
      projectId: String(ws.id),
      projectName: ws.name,
      env: conn.env_key,
      label: conn.name,
      host: conn.display_host,
    });
  }, [hasHydrated, isLoading, workspaces, selectedConnection?.connectionId, selectConnection]);

  const pickConnection = (
    workspace: (typeof workspaces)[0],
    conn: (typeof workspaces)[0]["connections"][0],
  ) => {
    const selected: SelectedConnection = {
      connectionId: conn.id,
      projectId: String(workspace.id),
      projectName: workspace.name,
      env: conn.env_key,
      label: conn.name,
      host: conn.display_host,
    };
    selectConnection(selected);
  };

  const isConnActive = (
    _workspace: (typeof workspaces)[0],
    conn: (typeof workspaces)[0]["connections"][0],
  ) => selectedConnection?.connectionId === conn.id;

  const showSkeleton = isLoading || !hasHydrated;

  return (
    <>
      <UiSidebar collapsible="offcanvas" className="border-sidebar-border">
        <SidebarRail />
        <SidebarHeader className="h-12 flex-row items-center gap-2 border-b border-sidebar-border px-3 py-0">
          <div className="size-6 rounded-md bg-gradient-to-br from-electric to-neon flex items-center justify-center shrink-0">
            <Database className="size-3.5 text-background" />
          </div>
          <span className="font-mono text-sm tracking-tight truncate">
            kueri<span className="text-electric">.dev</span>
          </span>
        </SidebarHeader>

        <div className="px-3 pt-3 shrink-0">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="kueri-sidebar-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-surface-1 border border-border rounded-md text-xs pl-8 pr-2 py-2 outline-none focus:border-electric/60 focus:ring-1 focus:ring-electric/30 transition-colors"
            />
          </div>
        </div>

        <SidebarContent className="px-2 py-3 space-y-5">
          {showSkeleton ? (
            <SidebarSectionSkeleton />
          ) : (
            <>
              <FavoritesSection
                favorites={favoriteScripts}
                onOpenScript={openScript}
                onToggleFavorite={toggleFavorite}
                onEditScript={openEditScript}
                onDeleteScript={(s) => setDeleteTarget({ kind: "script", id: s.id, name: s.title })}
                isTogglingFavorite={isTogglingFavorite}
              />
              <div>
                <div className="px-2 flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Workspaces
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Add workspace"
                    onClick={() => setWorkspaceDialogOpen(true)}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <div className="space-y-0.5">
                  {filteredWorkspaces.length === 0 && (
                    <p className="px-2 text-xs text-muted-foreground">No workspaces found.</p>
                  )}
                  {filteredWorkspaces.map((ws) => {
                    const open = openProjects[ws.id] ?? ws.id === workspaces[0]?.id;
                    return (
                      <div key={ws.id}>
                        <div className="group flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setOpenProjects((s) => ({ ...s, [ws.id]: !open }))}
                            className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-surface-1 transition-colors min-w-0"
                          >
                            <ChevronRight
                              className={cn(
                                "size-3.5 text-muted-foreground transition-transform shrink-0",
                                open && "rotate-90",
                              )}
                            />
                            <FolderGit2 className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                            <span className="truncate">{ws.name}</span>
                          </button>
                          <SidebarItemMenu
                            editLabel="Rename"
                            onEdit={() =>
                              setRenameTarget({ kind: "workspace", id: ws.id, name: ws.name })
                            }
                            onDelete={() =>
                              setDeleteTarget({ kind: "workspace", id: ws.id, name: ws.name })
                            }
                          />
                          <button
                            type="button"
                            aria-label={`Add connection to ${ws.name}`}
                            onClick={() =>
                              setConnectionDialog({ workspaceId: ws.id, workspaceName: ws.name })
                            }
                            className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>

                        {open && (
                          <div className="ml-6 mt-0.5 mb-1 space-y-1 border-l border-border/70 pl-2">
                            {ws.connections.length === 0 && (
                              <p className="px-2 py-1 text-[10px] text-muted-foreground">No connections</p>
                            )}
                            {ws.connections.map((c) => (
                              <div key={c.id} className="group flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => pickConnection(ws, c)}
                                  className={cn(
                                    "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-surface-1 transition-colors min-w-0",
                                    isConnActive(ws, c) && "bg-surface-1 ring-1 ring-electric/30",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "size-2 rounded-full shrink-0",
                                      envDot[c.env_key] ?? "bg-muted",
                                    )}
                                  />
                                  <span className="truncate">{c.name}</span>
                                  <span className="ml-auto text-[10px] text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-[90px]">
                                    {c.display_host}
                                  </span>
                                </button>
                                <SidebarItemMenu
                                  onDelete={() =>
                                    setDeleteTarget({
                                      kind: "connection",
                                      workspaceId: ws.id,
                                      id: c.id,
                                      name: c.name,
                                    })
                                  }
                                />
                              </div>
                            ))}

                            <div className="pt-1">
                              <div className="px-2 flex items-center justify-between mb-0.5">
                                <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                                  Scripts
                                </span>
                                <button
                                  type="button"
                                  aria-label={`New script in ${ws.name}`}
                                  onClick={() => void createNewScript(ws.id)}
                                  className="p-0.5 text-muted-foreground hover:text-foreground transition-colors rounded"
                                >
                                  <Plus className="size-3" />
                                </button>
                              </div>
                              {(scriptsByWorkspace.get(ws.id) ?? []).length === 0 ? (
                                <p className="px-2 py-1 text-[10px] text-muted-foreground">No scripts</p>
                              ) : (
                                <div className="space-y-0.5">
                                  {(scriptsByWorkspace.get(ws.id) ?? []).map((s) => (
                                    <div key={s.id} className="group flex items-start gap-0.5">
                                      <button
                                        type="button"
                                        onClick={() => openScript(s.id)}
                                        className="flex-1 text-left px-2 py-1.5 rounded-md hover:bg-surface-1 transition-colors min-w-0"
                                      >
                                        <div className="flex items-center gap-2">
                                          <FileCode2 className="size-3 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                                          <span className="text-xs truncate">{s.title}</span>
                                        </div>
                                        {s.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1 pl-5">
                                            {s.tags.map((t) => (
                                              <Tag key={t.name} label={t.name} color={t.color} />
                                            ))}
                                          </div>
                                        )}
                                      </button>
                                      <ScriptFavoriteButton
                                        isFavorite={s.is_favorite}
                                        disabled={isTogglingFavorite}
                                        onToggle={() => toggleFavorite(s.id)}
                                        className="mt-1"
                                      />
                                      <SidebarItemMenu
                                        className="mt-1"
                                        onEdit={() => openEditScript(s.id)}
                                        onDelete={() =>
                                          setDeleteTarget({ kind: "script", id: s.id, name: s.title })
                                        }
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-2 gap-1">
          <button
            type="button"
            onClick={openWorkspace}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors",
              view === "workspace"
                ? "bg-surface-1 text-foreground ring-1 ring-electric/30"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-1/60",
            )}
          >
            <FileCode2 className="size-3.5 shrink-0" />
            <span className="flex-1 text-left">Editor</span>
          </button>
          <button
            type="button"
            onClick={() => openSettings("guide")}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors",
              view === "settings"
                ? "bg-surface-1 text-foreground ring-1 ring-electric/30"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-1/60",
            )}
          >
            <Settings className="size-3.5 shrink-0" />
            <span className="flex-1 text-left">Settings</span>
            <span className="text-[10px] font-mono opacity-60">?</span>
          </button>
        </SidebarFooter>
      </UiSidebar>

      <CreateWorkspaceDialog open={workspaceDialogOpen} onOpenChange={setWorkspaceDialogOpen} />
      {connectionDialog && (
        <CreateConnectionDialog
          open
          onOpenChange={(open) => {
            if (!open) setConnectionDialog(null);
          }}
          workspaceId={connectionDialog.workspaceId}
          workspaceName={connectionDialog.workspaceName}
          existingConnections={
            workspaces.find((ws) => ws.id === connectionDialog.workspaceId)?.connections ?? []
          }
        />
      )}
      {renameTarget && (
        <RenameDialog
          open
          onOpenChange={(open) => {
            if (!open) setRenameTarget(null);
          }}
          title="Rename workspace"
          description="Update the workspace name shown in the sidebar."
          label="Workspace name"
          initialName={renameTarget.name}
          placeholder="My project"
          isPending={renameMutation.isPending}
          onSubmit={(name) => {
            if (!name) {
              showValidationError("Name is required");
              return;
            }
            renameMutation.mutate({ ...renameTarget, name });
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          title={
            deleteTarget.kind === "workspace"
              ? "Delete workspace?"
              : deleteTarget.kind === "connection"
                ? "Delete connection?"
                : "Delete script?"
          }
          description={
            deleteTarget.kind === "workspace"
              ? `"${deleteTarget.name}" and its connections will be removed. Saved scripts in this workspace will no longer appear in your library.`
              : deleteTarget.kind === "connection"
                ? `"${deleteTarget.name}" will be removed from this workspace.`
                : `"${deleteTarget.name}" will be permanently removed from your script library.`
          }
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget)}
        />
      )}
    </>
  );
}
