import { Clock } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useWorkspaceStore } from "@/stores/workspace-store";

type QueryHistorySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickSql: (sql: string) => void;
};

export function QueryHistorySheet({ open, onOpenChange, onPickSql }: QueryHistorySheetProps) {
  const history = useWorkspaceStore((s) => s.queryHistory);
  const setResultsView = useWorkspaceStore((s) => s.setResultsView);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Clock className="size-4" /> Query history
          </SheetTitle>
          <SheetDescription>Last 10 runs in this browser (persisted locally).</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {history.length === 0 && (
            <p className="text-sm text-muted-foreground">No queries run yet.</p>
          )}
          {history.map((h) => (
            <button
              key={h.id}
              type="button"
              className="w-full text-left rounded-md border border-border p-3 hover:bg-surface-1 transition-colors"
              onClick={() => {
                onPickSql(h.sql);
                setResultsView("results");
                onOpenChange(false);
              }}
            >
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mb-1">
                <span>{h.env}</span>
                <span>{new Date(h.ranAt).toLocaleString()}</span>
              </div>
              <pre className="text-xs font-mono line-clamp-3 whitespace-pre-wrap">{h.sql}</pre>
              {(h.rowCount != null || h.durationMs != null) && (
                <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                  {h.rowCount != null && `${h.rowCount} rows`}
                  {h.durationMs != null && ` • ${h.durationMs} ms`}
                </div>
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
