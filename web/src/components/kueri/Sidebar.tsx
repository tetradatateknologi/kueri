import { useState } from "react";
import { ChevronRight, Database, FolderGit2, FileCode2, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type EnvKey = "dev" | "staging" | "prod";

const projects = [
  {
    name: "E-Commerce App",
    connections: [
      { env: "dev" as EnvKey, label: "Development", host: "localhost:5432" },
      { env: "staging" as EnvKey, label: "Staging", host: "staging.db.internal" },
      { env: "prod" as EnvKey, label: "Production", host: "prod-cluster.aws" },
    ],
  },
  {
    name: "Analytics Pipeline",
    connections: [
      { env: "dev" as EnvKey, label: "Development", host: "localhost:5433" },
      { env: "prod" as EnvKey, label: "Production", host: "analytics.aws" },
    ],
  },
];

const envDot: Record<EnvKey, string> = {
  dev: "bg-env-dev",
  staging: "bg-env-staging",
  prod: "bg-env-prod",
};

const scripts = [
  { title: "Monthly Revenue Report", tags: [{ t: "Reporting", c: "electric" }, { t: "MySQL", c: "neon" }] },
  { title: "Active Users Last 7d", tags: [{ t: "Analytics", c: "electric" }] },
  { title: "Delete Stale Sessions", tags: [{ t: "Maintenance", c: "neon" }, { t: "Critical", c: "danger" }] },
  { title: "Order Funnel Cohort", tags: [{ t: "Reporting", c: "electric" }, { t: "Postgres", c: "neon" }] },
  { title: "Refund Audit", tags: [{ t: "Finance", c: "electric" }, { t: "Critical", c: "danger" }] },
];

function Tag({ label, color }: { label: string; color: string }) {
  const styles: Record<string, string> = {
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
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({ "E-Commerce App": true });

  return (
    <aside className="w-72 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      {/* Brand */}
      <div className="h-12 px-4 flex items-center gap-2 border-b border-sidebar-border">
        <div className="size-6 rounded-md bg-gradient-to-br from-electric to-neon flex items-center justify-center">
          <Database className="size-3.5 text-background" />
        </div>
        <span className="font-mono text-sm tracking-tight">
          kueri<span className="text-electric">.dev</span>
        </span>
      </div>

      {/* Search */}
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
        {/* Workspaces */}
        <div>
          <div className="px-2 flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Workspaces
            </span>
            <button className="text-muted-foreground hover:text-electric transition-colors">
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="space-y-0.5">
            {projects.map((p) => {
              const open = openProjects[p.name];
              return (
                <div key={p.name}>
                  <button
                    onClick={() => setOpenProjects((s) => ({ ...s, [p.name]: !s[p.name] }))}
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
                          key={c.label}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-surface-1 transition-colors group"
                        >
                          <span className={cn("size-2 rounded-full shrink-0", envDot[c.env])} />
                          <span className="truncate">{c.label}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                            {c.host}
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

        {/* Script Library */}
        <div>
          <div className="px-2 flex items-center justify-between mb-1.5">
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              Script Library
            </span>
            <button className="text-muted-foreground hover:text-electric transition-colors">
              <Plus className="size-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {scripts.map((s) => (
              <button
                key={s.title}
                className="w-full text-left px-2 py-2 rounded-md hover:bg-surface-1 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <FileCode2 className="size-3.5 text-muted-foreground group-hover:text-neon transition-colors shrink-0" />
                  <span className="text-xs truncate">{s.title}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5 pl-5">
                  {s.tags.map((t) => (
                    <Tag key={t.t} label={t.t} color={t.c} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-sidebar-border px-3 py-2 flex items-center gap-2">
        <div className="size-6 rounded-full bg-gradient-to-br from-electric to-neon" />
        <div className="text-xs">
          <div className="leading-tight">alex.dev</div>
          <div className="text-[10px] text-muted-foreground leading-tight">Free plan</div>
        </div>
      </div>
    </aside>
  );
}
