import type { Script } from "@/lib/api/types";

/** Mirrors api/internal/modules/script/service.go isUntitledTitle */
export function isReservedScriptTitle(title: string): boolean {
  const lower = title.trim().toLowerCase();
  if (lower === "untitled.sql") return true;
  return lower.startsWith("untitled") && lower.endsWith(".sql");
}

export function generateNewScriptTitle(scripts: Script[]): string {
  const existing = new Set(scripts.map((s) => s.title.trim().toLowerCase()));
  let n = 1;
  while (true) {
    const candidate = `query-${n}.sql`;
    if (!existing.has(candidate) && !isReservedScriptTitle(candidate)) {
      return candidate;
    }
    n += 1;
  }
}
