import { useState } from "react";
import { ChevronRight, Database, FileCode2, FolderGit2, Loader2, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKueriApp } from "@/context/kueri-app";
import type { ScriptTag } from "@/lib/api/types";

const envDot: Record<string, string> = {
  dev: "bg-env-dev",
  staging: "bg-env-staging",
  prod: "bg-env-prod",
};

function Tag({ label, color }: { label: string; color: ScriptTag["color"] }) {
  const styles: Record<ScriptTag["color"], string> = {
    electric: "bg-electric/10 text-electric border-electric/30",
    neon: "bg-neon/10 text-neon border-neon/30",
    danger: "bg-destructive/15 text-destructive border-destructive/40",
  };
  return (
    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-mono tracking-tight", styles[color])}>
      #{label}
    </span>
  );
}

export function Sidebar() {
  const { me, workspaces, scripts, isLoading, error, openScript, activeScriptId } = useKueriApp();
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <aside className="w-72 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-xs">Loading workspace…</span>
      </aside>
    );
  }

  if (error) {
    return (
      <aside className="w-72 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full p-4">
        <p className="text-xs text-destructive">API error: {error.message}</p>
        <p className="text-[10px] text-muted-foreground mt-2">
          Start API + DB: <code className="font-mono">make docker-up && cd api && make migrate-up && make seed && make run</code>
        </p>
      </aside>
    );
  }

  return (
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
            placeholder="Search…"
            className="w-full bg-surface-1 border border-border rounded-md text-xs pl-8 pr-2 py-2 outline-none focus:border-electric/60 focus:ring-1 focus:ring-electric/30 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        <div>
          <div className="px-2 flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Workspaces
            </span>
            <button type="button" className="text-muted-foreground hover:text-electric transition-colors">
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {workspaces.map((p) => {
              const open = openProjects[p.name] ?? workspaces[0]?.id === p.id;
              return (
                <div key={p.id}>
                  <button
                    type="button"
                    onClick={() => setOpenProjects((s) => ({ ...s, [p.name]: !open }))}
                    className="w-full group flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-surface-1 transition-colors"
                  >
                    <ChevronRight
                      className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")}
                    />
                    <FolderGit2 className="size-3.5 text-muted-foreground group-hover:text-electric transition-colors" />
                    <span className="truncate">{p.name}</span>
                  </button>

                  {open && (
                    <div className="ml-6 mt-0.5 mb-1 space-y-0.5 border-l border-border/70 pl-2">
                      {p.connections.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-surface-1 transition-colors group"
                        >
                          <span className={cn("size-2 rounded-full shrink-0", envDot[c.env_key])} />
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
            <button type="button" className="text-muted-foreground hover:text-electric transition-colors">
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {scripts.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openScript(s.id)}
                className={cn(
                  "w-full text-left px-2 py-2 rounded-md hover:bg-surface-1 transition-colors group",
                  activeScriptId === s.id && "bg-surface-1 ring-1 ring-electric/30",
                )}
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
      </div>

      <div className="border-t border-sidebar-border px-3 py-2 flex items-center gap-2">
        <div className="size-6 rounded-full bg-gradient-to-br from-electric to-neon" />
        <div className="text-xs">
          <div className="leading-tight">{me?.email.split("@")[0] ?? "user"}.dev</div>
          <div className="text-[10px] text-muted-foreground leading-tight">{me?.plan ?? "—"}</div>
        </div>
      </div>
    </aside>
  );
}
