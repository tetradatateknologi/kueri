import { useMemo, useState } from "react";
import { ArrowUpDown, Database } from "lucide-react";

import { ResultsTableSkeleton } from "@/components/kueri/ResultsTableSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import type { QueryResult } from "@/lib/api/types";

type SortDir = "asc" | "desc";

type ResultsGridProps = {
  result: QueryResult | null;
  isLoading: boolean;
  error: string | null;
};

const statusColor: Record<string, string> = {
  paid: "text-neon bg-neon/10 border-neon/30",
  pending: "text-env-staging bg-env-staging/10 border-env-staging/30",
  refunded: "text-muted-foreground bg-muted border-border",
  failed: "text-destructive bg-destructive/10 border-destructive/30",
};

export function ResultsGrid({ result, isLoading, error }: ResultsGridProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sortedRows = useMemo(() => {
    if (!result || sortCol == null) return result?.rows ?? [];
    const colIndex = result.columns.indexOf(sortCol);
    if (colIndex < 0) return result.rows;

    return [...result.rows].sort((a, b) => {
      const av = a[colIndex];
      const bv = b[colIndex];
      const aStr = av == null ? "" : String(av);
      const bStr = bv == null ? "" : String(bv);
      const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [result, sortCol, sortDir]);

  if (isLoading) {
    return <ResultsTableSkeleton />;
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
        <Database className="size-10 opacity-40" />
        <p className="text-sm">Run a query to see results</p>
        <p className="text-[11px] font-mono opacity-70">⌘↵ or click Run Query</p>
      </div>
    );
  }

  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  return (
    <div className="h-full overflow-auto flex flex-col">
      <table className="w-full text-xs font-mono">
        <thead className="sticky top-0 bg-surface-1 border-b border-border z-10">
          <tr>
            <th className="w-10 text-left px-3 py-2 text-muted-foreground font-medium">#</th>
            {result.columns.map((c) => (
              <th
                key={c}
                className="text-left px-3 py-2 text-muted-foreground font-medium cursor-pointer hover:text-electric transition-colors group"
                onClick={() => toggleSort(c)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {c}
                  <ArrowUpDown
                    className={cn(
                      "size-3 transition-opacity",
                      sortCol === c ? "opacity-100 text-electric" : "opacity-40 group-hover:opacity-100",
                    )}
                  />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-border/60 hover:bg-surface-1/60 transition-colors"
            >
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  {result.columns[j] === "status" ? (
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] ${statusColor[String(cell)] ?? ""}`}
                    >
                      {String(cell)}
                    </span>
                  ) : (
                    String(cell ?? "")
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 text-[10px] text-muted-foreground font-mono border-t border-border bg-surface-1/40 mt-auto">
        {result.rowCount} rows • {result.durationMs} ms
        {result.cached ? " • cached" : ""}
      </div>
    </div>
  );
}
