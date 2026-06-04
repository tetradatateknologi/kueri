import { describe, expect, it } from "vitest";

import type { Script, Workspace } from "@/lib/api/types";
import { getFavoriteScripts, groupFavoriteScriptsByWorkspace } from "@/lib/favorite-scripts";

function script(id: number, workspaceId: number, favorite = true): Script {
  return {
    id,
    workspace_id: workspaceId,
    title: `script-${id}`,
    sql_text: "",
    tags: [],
    is_favorite: favorite,
    favorite_sort: id,
  };
}

const workspaces: Workspace[] = [
  { id: 10, name: "alpha.example", connections: [] },
  { id: 20, name: "beta.example", connections: [] },
];

describe("getFavoriteScripts", () => {
  it("returns only favorites sorted by favorite_sort", () => {
    const scripts = [script(2, 10), script(1, 10, false), script(3, 20)];
    expect(getFavoriteScripts(scripts).map((s) => s.id)).toEqual([2, 3]);
  });
});

describe("groupFavoriteScriptsByWorkspace", () => {
  it("groups favorites by workspace in workspace list order", () => {
    const favorites = getFavoriteScripts([
      script(1, 20),
      script(2, 10),
      script(3, 20),
    ]);
    const groups = groupFavoriteScriptsByWorkspace(favorites, workspaces);
    expect(groups.map((g) => g.workspaceName)).toEqual(["alpha.example", "beta.example"]);
    expect(groups[0]?.scripts.map((s) => s.id)).toEqual([2]);
    expect(groups[1]?.scripts.map((s) => s.id)).toEqual([1, 3]);
  });
});
