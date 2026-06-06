import type { Script, Workspace } from "@/lib/api/types";

export type EditorTab = {
  scriptId: number;
  scriptName: string;
  projectId: number;
  projectName: string;
  workspaceId: number;
  workspaceName: string;
  isDirty: boolean;
};

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

export function buildOpenedTabs(
  openScriptIds: number[],
  scripts: Script[],
  workspaces: Workspace[],
  drafts: Record<number, string>,
): EditorTab[] {
  return openScriptIds
    .map((scriptId) => {
      const script = scripts.find((s) => s.id === scriptId);
      if (!script) return null;

      const workspace = workspaces.find((w) => w.id === script.workspace_id);
      const projectName = workspace?.name ?? "Unknown project";

      return {
        scriptId: script.id,
        scriptName: script.title,
        projectId: script.workspace_id,
        projectName,
        workspaceId: script.workspace_id,
        workspaceName: projectName,
        isDirty: isScriptDirty(script.id, drafts, scripts),
      };
    })
    .filter((tab): tab is EditorTab => tab != null);
}

export function resolveNextActiveTabId(
  openScriptIds: number[],
  closedId: number,
): number | null {
  const closedIndex = openScriptIds.indexOf(closedId);
  const remaining = openScriptIds.filter((id) => id !== closedId);
  if (remaining.length === 0) return null;
  if (closedIndex < 0) return remaining[0] ?? null;
  if (closedIndex < remaining.length) return remaining[closedIndex] ?? null;
  return remaining[remaining.length - 1] ?? null;
}

export function formatEditorContextLabel(
  tab: Pick<EditorTab, "projectName" | "scriptName">,
): string {
  return `${tab.projectName} / ${tab.scriptName}`;
}

export function resolveSaveScriptId(activeScriptId: number | null): number | null {
  return activeScriptId;
}
