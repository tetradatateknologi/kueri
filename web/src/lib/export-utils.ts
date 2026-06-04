import type { QueryResult } from "@/lib/api/types";
import type { WorkspaceEnv } from "@/stores/workspace-store";

export function envToApiEnv(env: WorkspaceEnv): "development" | "staging" | "production" {
  switch (env) {
    case "Development":
      return "development";
    case "Staging":
      return "staging";
    case "Production":
      return "production";
  }
}

export function formatExportFilename(
  template: string,
  ctx: {
    project: string;
    env: WorkspaceEnv;
    table: string;
    user: string;
    date?: Date;
  },
): string {
  const date = (ctx.date ?? new Date()).toISOString().slice(0, 10);
  const envSlug = envToApiEnv(ctx.env);
  return template
    .replace(/\{\{project\}\}/g, ctx.project)
    .replace(/\{\{env\}\}/g, envSlug)
    .replace(/\{\{table\}\}/g, ctx.table)
    .replace(/\{\{date\}\}/g, date)
    .replace(/\{\{user\}\}/g, ctx.user);
}

export function inferTableName(sql: string): string {
  const match = /\bfrom\s+["`]?(\w+)["`]?/i.exec(sql);
  return match?.[1]?.toLowerCase() ?? "results";
}

export function resultToCsv(result: QueryResult): string {
  const escape = (cell: unknown) => {
    const s = cell == null ? "" : String(cell);
    if (/[",\n\r]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [result.columns.map(escape).join(",")];
  for (const row of result.rows) {
    lines.push(row.map(escape).join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
