import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Database, FolderGit2, FileCode2, Plus, Search } from "lucide-react";

import { CreateConnectionDialog } from "@/components/kueri/CreateConnectionDialog";
import { CreateWorkspaceDialog } from "@/components/kueri/CreateWorkspaceDialog";
import { ProductionEnvDialog } from "@/components/kueri/ProductionEnvDialog";
import { SidebarSectionSkeleton } from "@/components/kueri/SidebarSectionSkeleton";
import { useKueriApp } from "@/context/kueri-app";
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

export function Sidebar() {
  const { me, workspaces, scripts, isLoading, openScript } = useKueriApp();
  const hasHydrated = useWorkspaceStore((s) => s._hasHydrated);
  const selectedConnection = useWorkspaceStore((s) => s.selectedConnection);
  const setSelectedConnection = useWorkspaceStore((s) => s.setSelectedConnection);

  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [workspaceDialogOpen, setWorkspaceDialogOpen] = useState(false);
  const [connectionDialog, setConnectionDialog] = useState<{
    workspaceId: number;
    workspaceName: string;
  } | null>(null);
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const pendingConnection = useRef<SelectedConnection | null>(null);

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
      .filter((ws) => ws.name.toLowerCase().includes(q) || ws.connections.length > 0);
  }, [workspaces, search]);

  const filteredScripts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scripts;
    return scripts.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.tags.some((t) => t.name.toLowerCase().includes(q)),
    );
  }, [scripts, search]);

  useEffect(() => {
    if (!hasHydrated || isLoading || workspaces.length === 0) return;
    if (selectedConnection?.connectionId) return;

    const ws = workspaces[0];
    const conn = ws.connections[0];
    if (!conn) return;

    setSelectedConnection({
      connectionId: conn.id,
      projectId: String(ws.id),
      projectName: ws.name,
      env: conn.env_key,
      label: conn.name,
      host: conn.display_host,
    });
  }, [hasHydrated, isLoading, workspaces, selectedConnection?.connectionId, setSelectedConnection]);

  const applyConnection = (selected: SelectedConnection) => {
    if (selected.env === "prod") {
      pendingConnection.current = selected;
      setProdDialogOpen(true);
      return;
    }
    setSelectedConnection(selected);
  };

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
    applyConnection(selected);
  };

  const isConnActive = (
    _workspace: (typeof workspaces)[0],
    conn: (typeof workspaces)[0]["connections"][0],
  ) => selectedConnection?.connectionId === conn.id;

  const showSkeleton = isLoading || !hasHydrated;

  return (
    <>
      <aside className="w-72 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
        <div className="h-12 px-4 flex items-center gap-2 border-b border-sidebar-border">
          <div className="size-6 rounded-md bg-gradient-to-br from-electric to-neon flex items-center justify-center">
            <Database className="size-3.5 text-background" />
          </div>
          <span className="font-mono text-sm tracking-tight">
            kueri<span className="text-electric">.dev</span>
          </span>
        </div>

        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-surface-1 border border-border rounded-md text-xs pl-8 pr-2 py-2 outline-none focus:border-electric/60 focus:ring-1 focus:ring-electric/30 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
          {showSkeleton ? (
            <SidebarSectionSkeleton />
          ) : (
            <>
              <div>
                <div className="px-2 flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Workspaces
                  </span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-electric transition-colors"
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
                    const open = openProjects[ws.name] ?? ws.id === workspaces[0]?.id;
                    return (
                      <div key={ws.id}>
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setOpenProjects((s) => ({ ...s, [ws.name]: !open }))}
                            className="flex-1 group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-surface-1 transition-colors"
                          >
                            <ChevronRight
                              className={cn(
                                "size-3.5 text-muted-foreground transition-transform",
                                open && "rotate-90",
                              )}
                            />
                            <FolderGit2 className="size-3.5 text-muted-foreground group-hover:text-electric transition-colors" />
                            <span className="truncate">{ws.name}</span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Add connection to ${ws.name}`}
                            onClick={() =>
                              setConnectionDialog({ workspaceId: ws.id, workspaceName: ws.name })
                            }
                            className="shrink-0 p-1.5 text-muted-foreground hover:text-electric transition-colors rounded-md"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>

                        {open && (
                          <div className="ml-6 mt-0.5 mb-1 space-y-0.5 border-l border-border/70 pl-2">
                            {ws.connections.length === 0 && (
                              <p className="px-2 py-1 text-[10px] text-muted-foreground">No connections</p>
                            )}
                            {ws.connections.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => pickConnection(ws, c)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-surface-1 transition-colors group",
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
                                <span className="ml-auto text-[10px] text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                  {c.display_host}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="px-2 flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
                    Script Library
                  </span>
                </div>

                <div className="space-y-1">
                  {filteredScripts.length === 0 && (
                    <p className="px-2 text-xs text-muted-foreground">No scripts match your search.</p>
                  )}
                  {filteredScripts.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => openScript(s.id)}
                      className="w-full text-left px-2 py-2 rounded-md hover:bg-surface-1 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <FileCode2 className="size-3.5 text-muted-foreground group-hover:text-neon transition-colors shrink-0" />
                        <span className="text-xs truncate">{s.title}</span>
                      </div>
                      {s.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pl-5">
                          {s.tags.map((t) => (
                            <Tag key={t.name} label={t.name} color={t.color} />
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-sidebar-border px-3 py-2 flex items-center gap-2">
          <div className="size-6 rounded-full bg-gradient-to-br from-electric to-neon" />
          <div className="text-xs">
            <div className="leading-tight">{me?.name ?? "Guest"}</div>
            <div className="text-[10px] text-muted-foreground leading-tight capitalize">
              {me?.plan ?? "loading"} plan
            </div>
          </div>
        </div>
      </aside>

      <CreateWorkspaceDialog open={workspaceDialogOpen} onOpenChange={setWorkspaceDialogOpen} />
      {connectionDialog && (
        <CreateConnectionDialog
          open
          onOpenChange={(open) => {
            if (!open) setConnectionDialog(null);
          }}
          workspaceId={connectionDialog.workspaceId}
          workspaceName={connectionDialog.workspaceName}
        />
      )}
      <ProductionEnvDialog
        open={prodDialogOpen}
        onOpenChange={setProdDialogOpen}
        onConfirm={() => {
          if (pendingConnection.current) {
            setSelectedConnection(pendingConnection.current);
            pendingConnection.current = null;
          }
          setProdDialogOpen(false);
        }}
      />
    </>
  );
}
