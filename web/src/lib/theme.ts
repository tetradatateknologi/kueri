export const THEME_STORAGE_KEY = "kueri:theme";

export type ThemeMode = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";

const VALID_THEMES = new Set<ThemeMode>(["dark", "light", "system"]);

export function isThemeMode(value: string | null | undefined): value is ThemeMode {
  return value != null && VALID_THEMES.has(value as ThemeMode);
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getResolvedTheme(theme: ThemeMode): ResolvedTheme {
  if (theme === "system") return getSystemTheme();
  return theme;
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : "dark";
  } catch {
    return "dark";
  }
}

export function writeStoredTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

export function applyThemeClass(resolvedTheme: ResolvedTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function initializeThemeFromStorage(): { theme: ThemeMode; resolvedTheme: ResolvedTheme } {
  const theme = readStoredTheme();
  const resolvedTheme = getResolvedTheme(theme);
  applyThemeClass(resolvedTheme);
  return { theme, resolvedTheme };
}
