import { Download } from "lucide-react";

import { EditorEmptyState } from "@/components/kueri/EditorEmptyState";
import { EditorPane } from "@/components/kueri/EditorPane";
import { JsonResultsView } from "@/components/kueri/JsonResultsView";
import { ResultsGrid } from "@/components/kueri/ResultsGrid";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Script } from "@/lib/api/types";
import type { QueryResult } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import type { ResultsView } from "@/stores/workspace-store";

type EditorResultsStackProps = {
  className?: string;
  hasOpenTab: boolean;
  draftSql: string;
  setDraftSql: (sql: string) => void;
  runQuery: () => void;
  activeTabId: string | null;
  activeScriptId: number | null;
  openEditScript: (id: number) => void;
  openEditTempTab: (tabId: string) => void;
  favoriteScripts: Script[];
  createNewScript: () => void | Promise<void>;
  openScript: (id: number) => void;
  resultsView: ResultsView;
  setResultsView: (view: ResultsView) => void;
  metaLabel: string | null;
  lastResult: QueryResult | null;
  executeMutationIsPending: boolean;
  lastQueryError: string | null;
  onLoadMore?: () => void;
  setExportOpen: (open: boolean) => void;
  connectionId?: number | null;
};

export function EditorResultsStack({
  className,
  hasOpenTab,
  draftSql,
  setDraftSql,
  runQuery,
  activeTabId,
  activeScriptId,
  openEditScript,
  openEditTempTab,
  favoriteScripts,
  createNewScript,
  openScript,
  resultsView,
  setResultsView,
  metaLabel,
  lastResult,
  executeMutationIsPending,
  lastQueryError,
  onLoadMore,
  setExportOpen,
  connectionId = null,
}: EditorResultsStackProps) {
  return (
    <ResizablePanelGroup
      orientation="vertical"
      className={cn("h-full min-h-0 min-w-0", className)}
      id="kueri-editor-results-v2"
      defaultLayout={{ "kueri-editor": 52, "kueri-results": 48 }}
    >
      <ResizablePanel id="kueri-editor" defaultSize="52%" minSize="25%" className="min-h-0">
        {hasOpenTab ? (
          <EditorPane
            value={draftSql}
            onChange={setDraftSql}
            onRun={runQuery}
            connectionId={connectionId}
            onEditScript={() => {
              if (activeScriptId != null) {
                openEditScript(activeScriptId);
              } else if (activeTabId != null) {
                openEditTempTab(activeTabId);
              }
            }}
          />
        ) : (
          <EditorEmptyState
            favorites={favoriteScripts}
            onCreateScript={() => void createNewScript()}
            onOpenScript={openScript}
          />
        )}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel id="kueri-results" defaultSize="48%" minSize="20%" className="min-h-0">
        <div className="h-full min-h-0 flex flex-col bg-background overflow-hidden">
          <div className="h-10 shrink-0 px-3 border-b border-border flex items-center gap-2 bg-surface-1/40">
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

            <div className="ml-auto flex items-center gap-2 min-w-0">
              {metaLabel && (
                <span className="text-[11px] text-muted-foreground font-mono truncate">
                  {metaLabel}
                </span>
              )}
              <button
                type="button"
                disabled={!lastResult}
                onClick={() => setExportOpen(true)}
                className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-neon/10 border border-neon/40 text-neon text-xs font-medium hover:bg-neon/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Download className="size-3.5" /> Smart Export
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {resultsView === "results" ? (
              <ResultsGrid
                result={lastResult}
                isLoading={executeMutationIsPending}
                error={lastQueryError}
                onLoadMore={onLoadMore}
              />
            ) : (
              <JsonResultsView result={lastResult} />
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
