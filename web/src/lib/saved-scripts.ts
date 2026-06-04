const STORAGE_KEY = "kueri:saved-scripts";

export type SavedScript = {
  id: string;
  title: string;
  sql: string;
  savedAt: string;
};

export function loadSavedScripts(): SavedScript[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedScript[];
  } catch {
    return [];
  }
}

export function saveScript(tab: { title: string; sql: string }): SavedScript[] {
  const entry: SavedScript = {
    id: `saved-${Date.now()}`,
    title: tab.title,
    sql: tab.sql,
    savedAt: new Date().toISOString(),
  };
  const next = [entry, ...loadSavedScripts()].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
