import { useState } from "react";
import { ChevronDown, Play, X, Plus, Download, Save, Clock, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SqlEditor } from "./SqlEditor";
import { ResultsGrid } from "./ResultsGrid";
import { ExportModal } from "./ExportModal";
import { useKueriApp } from "@/context/kueri-app";

type Env = "Development" | "Staging" | "Production";
const envMeta: Record<Env, { dot: string; ring: string }> = {
  Development: { dot: "bg-env-dev", ring: "ring-env-dev/40" },
  Staging: { dot: "bg-env-staging", ring: "ring-env-staging/40" },
  Production: { dot: "bg-env-prod", ring: "ring-env-prod/40" },
};

export function Workspace() {
  const {
    scripts,
    openScriptIds,
    activeScriptId,
    setActiveScriptId,
    closeScript,
    draftSql,
    setDraftSql,
    saveActiveScript,
    isSaving,
    runActiveQuery,
    isRunning,
    queryResult,
    createNewScript,
  } = useKueriApp();

  const [env, setEnv] = useState<Env>("Staging");
  const [envOpen, setEnvOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const openTabs = openScriptIds
    .map((id) => scripts.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s != null);

  const lineCount = draftSql.split("\n").length;

  return (
    <main className="flex-1 flex flex-col h-full min-w-0">
      <div className="h-10 bg-sidebar border-b border-border flex items-end pl-1 pr-2 select-none">
        <div className="flex items-end gap-px overflow-x-auto">
          {openTabs.map((t) => {
            const isActive = t.id === activeScriptId;
            return (
              <div
                key={t.id}
                onClick={() => setActiveScriptId(t.id)}
                className={cn(
                  "group h-9 pl-3 pr-1.5 flex items-center gap-2 text-xs cursor-pointer border-t-2 transition-colors rounded-t-md",
                  isActive
                    ? "bg-surface-1 border-electric text-foreground"
                    : "bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-1/40",
                )}
              >
                <span className="font-mono">{t.title}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (openTabs.length <= 1) return;
                    closeScript(t.id);
                  }}
                  className="size-4 rounded hover:bg-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => void createNewScript()}
            className="h-9 px-2 text-muted-foreground hover:text-electric transition-colors"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="h-12 px-3 flex items-center gap-2 border-b border-border bg-background">
        <div className="relative">
          <button
            type="button"
            onClick={() => setEnvOpen((o) => !o)}
            className={cn(
              "flex items-center gap-2 px-3 h-8 rounded-md bg-surface-1 border border-border text-xs hover:border-electric/60 transition-colors ring-1 ring-transparent",
              envMeta[env].ring,
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
                  type="button"
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
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        <button
          type="button"
          onClick={() => void saveActiveScript()}
          disabled={isSaving || activeScriptId == null}
          className="flex items-center gap-1.5 px-2 h-8 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
          Save
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 px-2 h-8 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
        >
          <Clock className="size-3.5" /> History
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground font-mono">{lineCount} lines</span>
          <button
            type="button"
            onClick={() => void runActiveQuery()}
            disabled={isRunning}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-electric text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all glow-electric disabled:opacity-70"
          >
            {isRunning ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5 fill-current" />}
            Run Query
            <span className="text-[10px] opacity-70 font-mono pl-1">⌘↵</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-rows-2">
        <div className="border-b border-border min-h-0">
          <SqlEditor value={draftSql} onChange={setDraftSql} />
        </div>

        <div className="min-h-0 flex flex-col bg-background">
          <div className="h-10 px-3 border-b border-border flex items-center gap-2 bg-surface-1/40">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="px-2.5 h-7 text-xs rounded-md bg-surface-1 border border-electric/40 text-electric font-medium"
              >
                Results
              </button>
              <button
                type="button"
                className="px-2.5 h-7 text-xs rounded-md text-muted-foreground hover:bg-surface-1 transition-colors"
              >
                Chart
              </button>
              <button
                type="button"
                className="px-2.5 h-7 text-xs rounded-md text-muted-foreground hover:bg-surface-1 transition-colors"
              >
                JSON
              </button>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-mono">
                {queryResult
                  ? `${queryResult.row_count} rows • ${queryResult.duration_ms} ms`
                  : "Run a query to see results"}
              </span>
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-neon/10 border border-neon/40 text-neon text-xs font-medium hover:bg-neon/20 transition-colors"
              >
                <Download className="size-3.5" /> Smart Export
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResultsGrid result={queryResult} />
          </div>
        </div>
      </div>

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
    </main>
  );
}
