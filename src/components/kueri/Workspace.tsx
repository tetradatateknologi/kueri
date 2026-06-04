import { useState } from "react";
import { ChevronDown, Play, X, Plus, Download, Save, Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SqlEditor } from "./SqlEditor";
import { ResultsGrid } from "./ResultsGrid";
import { ExportModal } from "./ExportModal";

type Env = "Development" | "Staging" | "Production";
const envMeta: Record<Env, { dot: string; ring: string }> = {
  Development: { dot: "bg-env-dev", ring: "ring-env-dev/40" },
  Staging: { dot: "bg-env-staging", ring: "ring-env-staging/40" },
  Production: { dot: "bg-env-prod", ring: "ring-env-prod/40" },
};

const initialTabs = [
  {
    id: "t1",
    title: "monthly_revenue.sql",
    sql: `-- Monthly revenue grouped by channel
SELECT
  channel,
  DATE_TRUNC('month', created_at) AS month,
  SUM(total) AS revenue,
  COUNT(*) AS orders
FROM orders
WHERE status = 'paid'
  AND created_at >= '2026-01-01'
GROUP BY channel, month
ORDER BY month DESC, revenue DESC
LIMIT 100;`,
  },
  {
    id: "t2",
    title: "active_users.sql",
    sql: `SELECT id, email, last_seen_at
FROM users
WHERE last_seen_at > NOW() - INTERVAL '7 days'
ORDER BY last_seen_at DESC;`,
  },
  {
    id: "t3",
    title: "refund_audit.sql",
    sql: `SELECT order_id, amount, reason
FROM refunds
WHERE created_at >= '2026-05-01';`,
  },
];

export function Workspace() {
  const [tabs, setTabs] = useState(initialTabs);
  const [active, setActive] = useState("t1");
  const [env, setEnv] = useState<Env>("Staging");
  const [envOpen, setEnvOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <main className="flex-1 flex flex-col h-full min-w-0">
      {/* Tab bar */}
      <div className="h-10 bg-sidebar border-b border-border flex items-end pl-1 pr-2 select-none">
        <div className="flex items-end gap-px overflow-x-auto">
          {tabs.map((t) => {
            const isActive = t.id === active;
            return (
              <div
                key={t.id}
                onClick={() => setActive(t.id)}
                className={cn(
                  "group h-9 pl-3 pr-1.5 flex items-center gap-2 text-xs cursor-pointer border-t-2 transition-colors rounded-t-md",
                  isActive
                    ? "bg-surface-1 border-electric text-foreground"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-1/40"
                )}
              >
                <span className="font-mono">{t.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const remaining = tabs.filter((x) => x.id !== t.id);
                    if (remaining.length === 0) return;
                    setTabs(remaining);
                    if (active === t.id) setActive(remaining[0].id);
                  }}
                  className="size-4 rounded hover:bg-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
          <button
            onClick={() => {
              const id = `t${Date.now()}`;
              setTabs([...tabs, { id, title: "untitled.sql", sql: "SELECT 1;" }]);
              setActive(id);
            }}
            className="h-9 px-2 text-muted-foreground hover:text-electric transition-colors"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {/* Editor toolbar */}
      <div className="h-12 px-3 flex items-center gap-2 border-b border-border bg-background">
        {/* Env switcher */}
        <div className="relative">
          <button
            onClick={() => setEnvOpen((o) => !o)}
            className={cn(
              "flex items-center gap-2 px-3 h-8 rounded-md bg-surface-1 border border-border text-xs hover:border-electric/60 transition-colors ring-1 ring-transparent",
              envMeta[env].ring
            )}
          >
            <span className={cn("size-2 rounded-full", envMeta[env].dot)} />
            <span className="text-muted-foreground">env:</span>
            <span className="font-mono">{env}</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>

          {envOpen && (
            <div className="absolute top-9 left-0 z-20 w-56 bg-popover border border-border rounded-md shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100">
              {(["Development", "Staging", "Production"] as Env[]).map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    setEnv(e);
                    setEnvOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-surface-1 transition-colors"
                >
                  <span className={cn("size-2 rounded-full", envMeta[e].dot)} />
                  <span className="font-mono">{e}</span>
                  {e === env && <Check className="size-3.5 ml-auto text-electric" />}
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1 px-3 pb-1 text-[10px] text-muted-foreground font-mono">
                ⌘E to switch
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        <button className="flex items-center gap-1.5 px-2 h-8 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors">
          <Save className="size-3.5" /> Save
        </button>
        <button className="flex items-center gap-1.5 px-2 h-8 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors">
          <Clock className="size-3.5" /> History
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-mono">
            {activeTab.sql.split("\n").length} lines
          </span>
          <button className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-electric text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all glow-electric">
            <Play className="size-3.5 fill-current" /> Run Query
            <span className="text-[10px] opacity-70 font-mono pl-1">⌘↵</span>
          </button>
        </div>
      </div>

      {/* Split: editor / results */}
      <div className="flex-1 min-h-0 grid grid-rows-2">
        <div className="border-b border-border min-h-0">
          <SqlEditor value={activeTab.sql} />
        </div>

        <div className="min-h-0 flex flex-col bg-background">
          {/* Results toolbar */}
          <div className="h-10 px-3 border-b border-border flex items-center gap-2 bg-surface-1/40">
            <div className="flex items-center gap-1">
              <button className="px-2.5 h-7 text-xs rounded-md bg-surface-1 border border-electric/40 text-electric font-medium">
                Results
              </button>
              <button className="px-2.5 h-7 text-xs rounded-md text-muted-foreground hover:bg-surface-1 transition-colors">
                Chart
              </button>
              <button className="px-2.5 h-7 text-xs rounded-md text-muted-foreground hover:bg-surface-1 transition-colors">
                JSON
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-mono">8 rows • 42 ms</span>
              <button
                onClick={() => setExportOpen(true)}
                className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-neon/10 border border-neon/40 text-neon text-xs font-medium hover:bg-neon/20 transition-colors"
              >
                <Download className="size-3.5" /> Smart Export
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResultsGrid />
          </div>
        </div>
      </div>

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </main>
  );
}
