import type { Script, Workspace } from "@/lib/api/types";

export type ScriptPersistenceState = "temporary" | "persisted";

export type TempScriptTab = {
  tempId: string;
  title: string;
  sql: string;
  lastSavedContent: string;
  workspaceId: number | null;
  workspaceName: string | null;
  connectionId: string | null;
  isDirty: boolean;
};

export type EditorTab = {
  tabId: string;
  scriptId: number | null;
  tempId: string | null;
  scriptName: string;
  projectId: number | null;
  projectName: string | null;
  workspaceId: number | null;
  workspaceName: string | null;
  isPersisted: boolean;
  isDirty: boolean;
};

export const DEFAULT_TEMP_SCRIPT_TITLE = "Untitled.sql";

let tempTabCounter = 0;

export function createTempTabId(): string {
  tempTabCounter += 1;
  return `temp_${Date.now().toString(36)}_${tempTabCounter}`;
}

export function isTempTabId(tabId: string): boolean {
  return tabId.startsWith("temp_");
}

export function tabIdFromScriptId(scriptId: number): string {
  return String(scriptId);
}

export function scriptIdFromTabId(tabId: string): number | null {
  if (isTempTabId(tabId)) return null;
  const id = Number(tabId);
  return Number.isFinite(id) ? id : null;
}

export function getScriptSavedSql(
  scriptId: number,
  scripts: Pick<Script, "id" | "sql_text">[],
): string {
  return scripts.find((s) => s.id === scriptId)?.sql_text ?? "";
}

export function getScriptDraft(
  scriptId: number,
  drafts: Record<number, string>,
  scripts: Pick<Script, "id" | "sql_text">[],
): string {
  if (drafts[scriptId] !== undefined) return drafts[scriptId];
  return getScriptSavedSql(scriptId, scripts);
}

export function isScriptDirty(
  scriptId: number,
  drafts: Record<number, string>,
  scripts: Pick<Script, "id" | "sql_text">[],
): boolean {
  if (drafts[scriptId] === undefined) return false;
  return drafts[scriptId] !== getScriptSavedSql(scriptId, scripts);
}

export function isTempTabDirty(
  tab: Pick<TempScriptTab, "sql" | "lastSavedContent" | "isDirty">,
): boolean {
  if (tab.isDirty) return true;
  return tab.sql !== tab.lastSavedContent;
}

export function isGenericScriptTitle(title: string): boolean {
  const lower = title.trim().toLowerCase();
  if (lower === "untitled.sql" || lower === "new script.sql") return true;
  if (/^untitled \d+\.sql$/.test(lower)) return true;
  if (lower.startsWith("untitled") && lower.endsWith(".sql")) return true;
  return false;
}

export function generateTempScriptTitle(tempTabs: Pick<TempScriptTab, "title">[]): string {
  const existing = new Set(tempTabs.map((tab) => tab.title.trim().toLowerCase()));
  if (!existing.has(DEFAULT_TEMP_SCRIPT_TITLE.toLowerCase())) {
    return DEFAULT_TEMP_SCRIPT_TITLE;
  }
  let n = 1;
  while (existing.has(`untitled ${n}.sql`)) {
    n += 1;
  }
  return `Untitled ${n}.sql`;
}

export function buildOpenedTabs(
  openTabIds: string[],
  scripts: Script[],
  workspaces: Workspace[],
  drafts: Record<number, string>,
  tempTabs: Record<string, TempScriptTab>,
): EditorTab[] {
  const tabs: EditorTab[] = [];

  for (const tabId of openTabIds) {
    if (isTempTabId(tabId)) {
      const temp = tempTabs[tabId];
      if (!temp) continue;

      tabs.push({
        tabId,
        scriptId: null,
        tempId: temp.tempId,
        scriptName: temp.title,
        projectId: temp.workspaceId,
        projectName: temp.workspaceName,
        workspaceId: temp.workspaceId,
        workspaceName: temp.workspaceName,
        isPersisted: false,
        isDirty: isTempTabDirty(temp),
      });
      continue;
    }

    const scriptId = scriptIdFromTabId(tabId);
    if (scriptId == null) continue;

    const script = scripts.find((s) => s.id === scriptId);
    if (!script) continue;

    const workspace = workspaces.find((w) => w.id === script.workspace_id);
    const projectName = workspace?.name ?? "Unknown project";

    tabs.push({
      tabId,
      scriptId: script.id,
      tempId: null,
      scriptName: script.title,
      projectId: script.workspace_id,
      projectName,
      workspaceId: script.workspace_id,
      workspaceName: projectName,
      isPersisted: true,
      isDirty: isScriptDirty(script.id, drafts, scripts),
    });
  }

  return tabs;
}

export function resolveNextActiveTabId(openTabIds: string[], closedId: string): string | null {
  const closedIndex = openTabIds.indexOf(closedId);
  const remaining = openTabIds.filter((id) => id !== closedId);
  if (remaining.length === 0) return null;
  if (closedIndex < 0) return remaining[0] ?? null;
  if (closedIndex < remaining.length) return remaining[closedIndex] ?? null;
  return remaining[remaining.length - 1] ?? null;
}

export function formatEditorContextLabel(
  tab: Pick<EditorTab, "isPersisted" | "projectName" | "scriptName">,
): string {
  if (!tab.isPersisted) {
    return `Unsaved / ${tab.scriptName}`;
  }
  return `${tab.projectName ?? "Unknown project"} / ${tab.scriptName}`;
}

export function formatTabLabel(tab: Pick<EditorTab, "scriptName" | "isDirty">): string {
  return tab.isDirty ? `${tab.scriptName} *` : tab.scriptName;
}

export function resolveSaveScriptId(tab: EditorTab | undefined): number | null {
  if (!tab?.isPersisted || tab.scriptId == null) return null;
  return tab.scriptId;
}

export function canCloseTabWithoutConfirm(tab: EditorTab, content: string): boolean {
  if (!tab.isPersisted && !tab.isDirty && content.trim() === "") {
    return true;
  }
  if (tab.isPersisted && !tab.isDirty) {
    return true;
  }
  return false;
}

export function createTempScriptTab(options: {
  workspaceId?: number | null;
  workspaceName?: string | null;
  connectionId?: string | null;
  existingTempTabs: TempScriptTab[];
  sql?: string;
}): TempScriptTab {
  const tempId = createTempTabId();
  const sql = options.sql ?? "";
  return {
    tempId,
    title: generateTempScriptTitle(options.existingTempTabs),
    sql,
    lastSavedContent: "",
    workspaceId: options.workspaceId ?? null,
    workspaceName: options.workspaceName ?? null,
    connectionId: options.connectionId ?? null,
    isDirty: false,
  };
}
