import type { Script, Workspace } from "@/lib/api/types";

export function getFavoriteScripts(scripts: Script[]): Script[] {
  return scripts
    .filter((s) => s.is_favorite)
    .sort((a, b) => (a.favorite_sort ?? 0) - (b.favorite_sort ?? 0));
}

export type FavoriteScriptsByWorkspace = {
  workspaceId: number;
  workspaceName: string;
  scripts: Script[];
};

export function groupFavoriteScriptsByWorkspace(
  favorites: Script[],
  workspaces: Workspace[],
): FavoriteScriptsByWorkspace[] {
  const workspaceOrder = new Map(workspaces.map((w, i) => [w.id, i]));
  const workspaceNames = new Map(workspaces.map((w) => [w.id, w.name]));
  const grouped = new Map<number, Script[]>();

  for (const script of favorites) {
    const list = grouped.get(script.workspace_id) ?? [];
    list.push(script);
    grouped.set(script.workspace_id, list);
  }

  return [...grouped.keys()]
    .sort((a, b) => {
      const ao = workspaceOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
      const bo = workspaceOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a - b;
    })
    .map((workspaceId) => ({
      workspaceId,
      workspaceName: workspaceNames.get(workspaceId) ?? `Workspace ${workspaceId}`,
      scripts: grouped.get(workspaceId)!,
    }));
}
