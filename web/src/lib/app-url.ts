import type { SettingsSection } from "@/context/app-view";
import type { Workspace } from "@/lib/api/types";

export const APP_URL_KEYS = {
  project: "project",
  script: "script",
  connection: "connection",
  view: "view",
  section: "section",
} as const;

export type AppUrlView = "workspace" | "settings";

export type AppUrlSnapshot = {
  project: string | null;
  scriptId: number | null;
  connectionId: number | null;
  view: AppUrlView;
  settingsSection: SettingsSection | null;
};

export type AppUrlPatch = {
  project?: string | null;
  scriptId?: number | null;
  connectionId?: number | null;
  view?: AppUrlView;
  settingsSection?: SettingsSection | null;
};

const SETTINGS_SECTIONS = new Set<SettingsSection>([
  "guide",
  "shortcuts",
  "backup",
  "about",
  "contribute",
]);

function parsePositiveInt(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function workspaceToProjectParam(workspace: Workspace): string {
  return workspace.name;
}

export function resolveWorkspaceByProjectParam(
  param: string,
  workspaces: Workspace[],
): Workspace | null {
  const decoded = decodeURIComponent(param.trim());
  if (!decoded) return null;

  const byId = Number.parseInt(decoded, 10);
  if (Number.isFinite(byId)) {
    const match = workspaces.find((w) => w.id === byId);
    if (match) return match;
  }

  const lower = decoded.toLowerCase();
  return workspaces.find((w) => w.name.toLowerCase() === lower) ?? null;
}

export function readAppUrlFromSearch(search: string): AppUrlSnapshot {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const viewRaw = params.get(APP_URL_KEYS.view);
  const view: AppUrlView = viewRaw === "settings" ? "settings" : "workspace";
  const sectionRaw = params.get(APP_URL_KEYS.section);
  const settingsSection =
    view === "settings" && sectionRaw && SETTINGS_SECTIONS.has(sectionRaw as SettingsSection)
      ? (sectionRaw as SettingsSection)
      : view === "settings"
        ? "guide"
        : null;

  return {
    project: params.get(APP_URL_KEYS.project),
    scriptId: parsePositiveInt(params.get(APP_URL_KEYS.script)),
    connectionId: parsePositiveInt(params.get(APP_URL_KEYS.connection)),
    view,
    settingsSection,
  };
}

export function readAppUrlFromLocation(location: Pick<Location, "search"> = window.location): AppUrlSnapshot {
  return readAppUrlFromSearch(location.search);
}

export function buildAppUrlSearchParams(
  patch: AppUrlPatch,
  base: URLSearchParams = new URLSearchParams(window.location.search),
): URLSearchParams {
  const params = new URLSearchParams(base.toString());

  if ("project" in patch) {
    if (patch.project) params.set(APP_URL_KEYS.project, patch.project);
    else params.delete(APP_URL_KEYS.project);
  }

  if ("scriptId" in patch) {
    if (patch.scriptId != null) params.set(APP_URL_KEYS.script, String(patch.scriptId));
    else params.delete(APP_URL_KEYS.script);
  }

  if ("connectionId" in patch) {
    if (patch.connectionId != null) {
      params.set(APP_URL_KEYS.connection, String(patch.connectionId));
    } else params.delete(APP_URL_KEYS.connection);
  }

  if ("view" in patch) {
    if (patch.view === "settings") params.set(APP_URL_KEYS.view, "settings");
    else params.delete(APP_URL_KEYS.view);
  }

  if ("settingsSection" in patch) {
    if (patch.settingsSection) params.set(APP_URL_KEYS.section, patch.settingsSection);
    else params.delete(APP_URL_KEYS.section);
  }

  if (params.get(APP_URL_KEYS.view) !== "settings") {
    params.delete(APP_URL_KEYS.section);
  }

  return params;
}

export function formatAppUrl(
  params: URLSearchParams,
  location: Pick<Location, "pathname" | "hash"> = window.location,
): string {
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
}

export function writeAppUrl(patch: AppUrlPatch, mode: "replace" | "push" = "replace"): void {
  const params = buildAppUrlSearchParams(patch);
  const url = formatAppUrl(params);
  if (mode === "push") {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
}

export function findConnectionInWorkspaces(
  connectionId: number,
  workspaces: Workspace[],
): { workspace: Workspace; connection: Workspace["connections"][number] } | null {
  for (const workspace of workspaces) {
    const connection = workspace.connections.find((c) => c.id === connectionId);
    if (connection) return { workspace, connection };
  }
  return null;
}

export function findScriptWorkspaceId(
  scriptId: number,
  scripts: { id: number; workspace_id: number }[],
): number | null {
  return scripts.find((s) => s.id === scriptId)?.workspace_id ?? null;
}
