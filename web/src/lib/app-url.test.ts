import { describe, expect, it } from "vitest";

import {
  buildAppUrlSearchParams,
  readAppUrlFromSearch,
  resolveWorkspaceByProjectParam,
  workspaceToProjectParam,
} from "@/lib/app-url";
import type { Workspace } from "@/lib/api/types";

const workspaces: Workspace[] = [
  { id: 10, name: "one.tetradata.id", connections: [] },
  { id: 20, name: "pids.asdp.id", connections: [] },
];

describe("readAppUrlFromSearch", () => {
  it("parses project, script, connection, and settings view", () => {
    const snap = readAppUrlFromSearch(
      "?project=one.tetradata.id&script=42&connection=7&view=settings&section=shortcuts",
    );
    expect(snap.project).toBe("one.tetradata.id");
    expect(snap.scriptId).toBe(42);
    expect(snap.connectionId).toBe(7);
    expect(snap.view).toBe("settings");
    expect(snap.settingsSection).toBe("shortcuts");
  });
});

describe("buildAppUrlSearchParams", () => {
  it("sets and clears params", () => {
    const params = buildAppUrlSearchParams(
      { project: "pids.asdp.id", scriptId: 3 },
      new URLSearchParams("foo=bar"),
    );
    expect(params.get("project")).toBe("pids.asdp.id");
    expect(params.get("script")).toBe("3");
    expect(params.get("foo")).toBe("bar");

    const cleared = buildAppUrlSearchParams({ project: null, scriptId: null }, params);
    expect(cleared.has("project")).toBe(false);
    expect(cleared.has("script")).toBe(false);
  });
});

describe("resolveWorkspaceByProjectParam", () => {
  it("matches by name or numeric id", () => {
    expect(resolveWorkspaceByProjectParam(workspaceToProjectParam(workspaces[0]!), workspaces)?.id).toBe(10);
    expect(resolveWorkspaceByProjectParam("20", workspaces)?.id).toBe(20);
    expect(resolveWorkspaceByProjectParam("missing", workspaces)).toBeNull();
  });
});
