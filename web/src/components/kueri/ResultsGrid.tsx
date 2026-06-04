import { ArrowUpDown } from "lucide-react";

const columns = ["id", "customer", "email", "total", "status", "created_at"];
const rows = [
  [1024, "Ava Martinez", "ava@northwind.io", "$248.00", "paid", "2026-05-31 14:02"],
  [1025, "Liam Chen", "liam.c@acme.dev", "$1,820.50", "paid", "2026-05-31 14:11"],
  [1026, "Noah Patel", "noah@studio.co", "$72.10", "refunded", "2026-05-31 14:24"],
  [1027, "Mia Thompson", "mia.t@hello.com", "$540.00", "pending", "2026-05-31 14:48"],
  [1028, "Ethan Brooks", "ethan@brooks.dev", "$96.75", "paid", "2026-05-31 15:02"],
  [1029, "Sofia Rivera", "sofia@rivera.io", "$2,310.00", "paid", "2026-05-31 15:33"],
  [1030, "Lucas Wright", "lucas@wright.co", "$18.40", "failed", "2026-05-31 15:51"],
  [1031, "Zoe Nakamura", "zoe@nakamura.jp", "$415.20", "paid", "2026-05-31 16:09"],
];

const statusColor: Record<string, string> = {
  paid: "text-neon bg-neon/10 border-neon/30",
  pending: "text-env-staging bg-env-staging/10 border-env-staging/30",
  refunded: "text-muted-foreground bg-muted border-border",
  failed: "text-destructive bg-destructive/10 border-destructive/30",
};

export function ResultsGrid() {
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
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-b border-border/60 hover:bg-surface-1/60 transition-colors"
            >
              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-2">
                  {columns[j] === "status" ? (
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] ${statusColor[String(cell)]}`}
                    >
                      {cell}
                    </span>
                  ) : (
                    String(cell)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 text-[10px] text-muted-foreground font-mono border-t border-border bg-surface-1/40">
        8 rows • 42 ms • cached
      </div>
    </div>
  );
}
