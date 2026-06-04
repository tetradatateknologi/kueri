import type { Script } from "@/lib/api/types";

export const SCRIPT_FILE_EXTENSION = ".sql";

/** Name without the fixed `.sql` suffix (for edit forms). */
export function stripScriptTitleExtension(title: string): string {
  const trimmed = title.trim();
  const lower = trimmed.toLowerCase();
  if (lower.endsWith(SCRIPT_FILE_EXTENSION)) {
    return trimmed.slice(0, -SCRIPT_FILE_EXTENSION.length);
  }
  return trimmed;
}

/** Full stored title from a bare script name. */
export function toScriptTitle(name: string): string {
  const base = stripScriptTitleExtension(name);
  if (!base) return "";
  return `${base}${SCRIPT_FILE_EXTENSION}`;
}

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
