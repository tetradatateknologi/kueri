import { ArrowUpDown } from "lucide-react";
import type { QueryRunResult } from "@/lib/api/types";

const statusColor: Record<string, string> = {
  paid: "text-neon bg-neon/10 border-neon/30",
  pending: "text-env-staging bg-env-staging/10 border-env-staging/30",
  refunded: "text-muted-foreground bg-muted border-border",
  failed: "text-destructive bg-destructive/10 border-destructive/30",
};

type ResultsGridProps = {
  result: QueryRunResult | null;
};

export function ResultsGrid({ result }: ResultsGridProps) {
  if (!result) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-muted-foreground font-mono">
        No results yet
      </div>
    );
  }

  const columns = result.columns;

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs font-mono">
        <thead className="sticky top-0 bg-surface-1 border-b border-border">
          <tr>
            <th className="w-10 text-left px-3 py-2 text-muted-foreground font-medium">#</th>
            {columns.map((c) => (
              <th
                key={c}
                className="text-left px-3 py-2 text-muted-foreground font-medium cursor-pointer hover:text-electric transition-colors group"
              >
                <span className="inline-flex items-center gap-1.5">
                  {c}
                  <ArrowUpDown className="size-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-border/60 hover:bg-surface-1/60 transition-colors"
            >
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              {columns.map((col) => {
                const cell = row[col];
                const display = cell == null ? "" : String(cell);
                return (
                  <td key={col} className="px-3 py-2">
                    {col === "status" ? (
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] ${statusColor[display] ?? "border-border"}`}
                      >
                        {display}
                      </span>
                    ) : (
                      display
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 text-[10px] text-muted-foreground font-mono border-t border-border bg-surface-1/40">
        {result.row_count} rows • {result.duration_ms} ms
      </div>
    </div>
  );
}
