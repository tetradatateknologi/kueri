import { describe, expect, it } from "vitest";

import type { Script, Workspace } from "@/lib/api/types";
import {
  buildOpenedTabs,
  formatEditorContextLabel,
  isScriptDirty,
  resolveNextActiveTabId,
  resolveSaveScriptId,
} from "@/lib/editor-tabs";

const workspaces: Workspace[] = [
  { id: 10, name: "asdp-pids", connections: [] },
  { id: 20, name: "one.tetradata.id", connections: [] },
];

const scripts: Script[] = [
  {
    id: 1,
    workspace_id: 10,
    title: "jadwal-operasional.sql",
    sql_text: "SELECT 1;",
    tags: [],
    is_favorite: false,
  },
  {
    id: 2,
    workspace_id: 20,
    title: "jadwal-operasional.sql",
    sql_text: "SELECT 2;",
    tags: [],
    is_favorite: false,
  },
  {
    id: 3,
    workspace_id: 10,
    title: "other.sql",
    sql_text: "SELECT 3;",
    tags: [],
    is_favorite: false,
  },
];

describe("buildOpenedTabs", () => {
  it("keeps projectId attached when opening a script from Project A", () => {
    const tabs = buildOpenedTabs([1], scripts, workspaces, {});
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toMatchObject({
      scriptId: 1,
      scriptName: "jadwal-operasional.sql",
      projectId: 10,
      projectName: "asdp-pids",
    });
  });

  it("treats same-named scripts in different projects as distinct tabs", () => {
    const tabs = buildOpenedTabs([1, 2], scripts, workspaces, {});
    expect(tabs.map((t) => t.scriptId)).toEqual([1, 2]);
    expect(tabs[0]?.projectId).toBe(10);
    expect(tabs[1]?.projectId).toBe(20);
    expect(tabs[0]?.scriptName).toBe(tabs[1]?.scriptName);
  });

  it("marks dirty tabs from draft state", () => {
    const tabs = buildOpenedTabs([1], scripts, workspaces, { 1: "SELECT changed;" });
    expect(tabs[0]?.isDirty).toBe(true);
  });
});

describe("resolveSaveScriptId", () => {
  it("uses activeScriptId and ignores sidebar filter context", () => {
    expect(resolveSaveScriptId(1)).toBe(1);
    expect(resolveSaveScriptId(null)).toBeNull();
  });
});

describe("resolveNextActiveTabId", () => {
  it("activates the nearest remaining tab to the right", () => {
    expect(resolveNextActiveTabId([1, 2, 3], 1)).toBe(2);
  });

  it("activates the nearest remaining tab to the left when closing the last tab", () => {
    expect(resolveNextActiveTabId([1, 2, 3], 3)).toBe(2);
  });

  it("returns null when closing the only tab", () => {
    expect(resolveNextActiveTabId([1], 1)).toBeNull();
  });
});

describe("isScriptDirty", () => {
  it("detects unsaved draft changes", () => {
    expect(isScriptDirty(1, { 1: "SELECT changed;" }, scripts)).toBe(true);
    expect(isScriptDirty(1, { 1: "SELECT 1;" }, scripts)).toBe(false);
    expect(isScriptDirty(1, {}, scripts)).toBe(false);
  });
});

describe("formatEditorContextLabel", () => {
  it("formats project and script for the editor navbar", () => {
    expect(
      formatEditorContextLabel({
        projectName: "asdp-pids",
        scriptName: "jadwal-operasional.sql",
      }),
    ).toBe("asdp-pids / jadwal-operasional.sql");
  });
});

describe("sidebar filter independence", () => {
  it("does not change activeScriptId when only the sidebar filter changes", () => {
    const activeScriptId = 1;
    const sidebarFilterProjectId = 20;
    const tab = buildOpenedTabs([activeScriptId], scripts, workspaces, {})[0];

    expect(sidebarFilterProjectId).not.toBe(tab?.projectId);
    expect(tab?.scriptId).toBe(activeScriptId);
    expect(resolveSaveScriptId(activeScriptId)).toBe(1);
  });

  it("keeps save target on Project A when sidebar filter is Project B", () => {
    const activeScriptId = 1;
    const sidebarFilterProjectId = 20;
    const saveTarget = resolveSaveScriptId(activeScriptId);
    const activeTab = buildOpenedTabs([activeScriptId], scripts, workspaces, {})[0];

    expect(sidebarFilterProjectId).toBe(20);
    expect(activeTab?.projectId).toBe(10);
    expect(saveTarget).toBe(1);
  });

  it("updates navbar label when switching between tabs from different projects", () => {
    const tabA = buildOpenedTabs([1], scripts, workspaces, {})[0]!;
    const tabB = buildOpenedTabs([2], scripts, workspaces, {})[0]!;

    expect(formatEditorContextLabel(tabA)).toBe("asdp-pids / jadwal-operasional.sql");
    expect(formatEditorContextLabel(tabB)).toBe("one.tetradata.id / jadwal-operasional.sql");
  });

  it("does not change active tab when clearing sidebar filter", () => {
    const activeScriptId = 2;
    const sidebarFilterProjectId: number | null = null;
    const activeTab = buildOpenedTabs([activeScriptId], scripts, workspaces, {})[0];

    expect(sidebarFilterProjectId).toBeNull();
    expect(activeTab?.scriptId).toBe(activeScriptId);
  });
});

describe("editor empty state transitions", () => {
  it("results in empty tabs when closing the only script", () => {
    const afterClose = buildOpenedTabs([], scripts, workspaces, {});
    expect(afterClose).toEqual([]);
    expect(resolveNextActiveTabId([1], 1)).toBeNull();
  });

  it("keeps active tab when closing a non-active tab", () => {
    const openScriptIds = [1, 3];
    const activeScriptId = 1;
    const closedId = 3;
    const remaining = openScriptIds.filter((id) => id !== closedId);

    expect(remaining).toEqual([1]);
    expect(activeScriptId).toBe(1);
    expect(resolveNextActiveTabId(openScriptIds, closedId)).toBe(1);
  });

  it("activates nearest tab when closing the active tab", () => {
    expect(resolveNextActiveTabId([1, 3], 1)).toBe(3);
    expect(resolveNextActiveTabId([1, 3], 3)).toBe(1);
  });
});
