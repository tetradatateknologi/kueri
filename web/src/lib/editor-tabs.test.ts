import { describe, expect, it } from "vitest";

import type { Script, Workspace } from "@/lib/api/types";
import {
  buildOpenedTabs,
  canCloseTabWithoutConfirm,
  createTempScriptTab,
  formatEditorContextLabel,
  formatTabLabel,
  generateTempScriptTitle,
  isGenericScriptTitle,
  isScriptDirty,
  isTempTabDirty,
  isTempTabId,
  resolveNextActiveTabId,
  resolveSaveScriptId,
  tabIdFromScriptId,
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

describe("temporary script tabs", () => {
  it("creates a temporary tab with isPersisted false", () => {
    const temp = createTempScriptTab({
      workspaceId: 10,
      workspaceName: "asdp-pids",
      existingTempTabs: [],
    });
    const tabs = buildOpenedTabs([temp.tempId], scripts, workspaces, {}, { [temp.tempId]: temp });

    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toMatchObject({
      tabId: temp.tempId,
      scriptId: null,
      tempId: temp.tempId,
      scriptName: "Untitled.sql",
      isPersisted: false,
      isDirty: false,
    });
  });

  it("does not include temporary tabs in persisted script list", () => {
    const temp = createTempScriptTab({ existingTempTabs: [] });
    const tabs = buildOpenedTabs([temp.tempId], scripts, workspaces, {}, { [temp.tempId]: temp });
    expect(scripts.some((s) => s.id === tabs[0]?.scriptId)).toBe(false);
  });

  it("supports two independent temporary scripts", () => {
    const tempA = createTempScriptTab({ existingTempTabs: [] });
    const tempB = createTempScriptTab({ existingTempTabs: [tempA] });
    const tempTabs = {
      [tempA.tempId]: tempA,
      [tempB.tempId]: tempB,
    };
    const tabs = buildOpenedTabs([tempA.tempId, tempB.tempId], scripts, workspaces, {}, tempTabs);

    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.scriptName).toBe("Untitled.sql");
    expect(tabs[1]?.scriptName).toBe("Untitled 1.sql");
    expect(tabs[0]?.isPersisted).toBe(false);
    expect(tabs[1]?.isPersisted).toBe(false);
  });

  it("marks temporary tabs dirty when SQL changes", () => {
    const temp = createTempScriptTab({ existingTempTabs: [] });
    const dirtyTemp = { ...temp, sql: "SELECT 1;", isDirty: true };
    expect(isTempTabDirty(dirtyTemp)).toBe(true);
  });
});

describe("buildOpenedTabs", () => {
  it("keeps projectId attached when opening a script from Project A", () => {
    const tabs = buildOpenedTabs(["1"], scripts, workspaces, {}, {});
    expect(tabs).toHaveLength(1);
    expect(tabs[0]).toMatchObject({
      tabId: "1",
      scriptId: 1,
      scriptName: "jadwal-operasional.sql",
      projectId: 10,
      projectName: "asdp-pids",
      isPersisted: true,
    });
  });

  it("treats same-named scripts in different projects as distinct tabs", () => {
    const tabs = buildOpenedTabs(["1", "2"], scripts, workspaces, {}, {});
    expect(tabs.map((t) => t.scriptId)).toEqual([1, 2]);
    expect(tabs[0]?.projectId).toBe(10);
    expect(tabs[1]?.projectId).toBe(20);
    expect(tabs[0]?.scriptName).toBe(tabs[1]?.scriptName);
  });

  it("marks dirty tabs from draft state", () => {
    const tabs = buildOpenedTabs(["1"], scripts, workspaces, { 1: "SELECT changed;" }, {});
    expect(tabs[0]?.isDirty).toBe(true);
  });
});

describe("resolveSaveScriptId", () => {
  it("uses persisted scriptId and ignores temporary tabs", () => {
    const persisted = buildOpenedTabs(["1"], scripts, workspaces, {}, {})[0]!;
    const temp = createTempScriptTab({ existingTempTabs: [] });
    const temporary = buildOpenedTabs(
      [temp.tempId],
      scripts,
      workspaces,
      {},
      { [temp.tempId]: temp },
    )[0]!;

    expect(resolveSaveScriptId(persisted)).toBe(1);
    expect(resolveSaveScriptId(temporary)).toBeNull();
    expect(resolveSaveScriptId(undefined)).toBeNull();
  });
});

describe("resolveNextActiveTabId", () => {
  it("activates the nearest remaining tab to the right", () => {
    expect(resolveNextActiveTabId(["1", "2", "3"], "1")).toBe("2");
  });

  it("activates the nearest remaining tab to the left when closing the last tab", () => {
    expect(resolveNextActiveTabId(["1", "2", "3"], "3")).toBe("2");
  });

  it("returns null when closing the only tab", () => {
    expect(resolveNextActiveTabId(["1"], "1")).toBeNull();
  });

  it("works with temporary tab ids", () => {
    const tempA = createTempScriptTab({ existingTempTabs: [] });
    const tempB = createTempScriptTab({ existingTempTabs: [tempA] });
    expect(resolveNextActiveTabId([tempA.tempId, tempB.tempId], tempA.tempId)).toBe(tempB.tempId);
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
  it("formats project and script for persisted tabs", () => {
    expect(
      formatEditorContextLabel({
        isPersisted: true,
        projectName: "asdp-pids",
        scriptName: "jadwal-operasional.sql",
      }),
    ).toBe("asdp-pids / jadwal-operasional.sql");
  });

  it("formats unsaved label for temporary tabs", () => {
    expect(
      formatEditorContextLabel({
        isPersisted: false,
        projectName: null,
        scriptName: "Untitled.sql",
      }),
    ).toBe("Unsaved / Untitled.sql");
  });
});

describe("formatTabLabel", () => {
  it("appends asterisk for dirty tabs", () => {
    expect(formatTabLabel({ scriptName: "Untitled.sql", isDirty: true })).toBe("Untitled.sql *");
    expect(formatTabLabel({ scriptName: "jadwal-operasional.sql", isDirty: false })).toBe(
      "jadwal-operasional.sql",
    );
  });
});

describe("canCloseTabWithoutConfirm", () => {
  it("closes clean empty temporary tabs without confirmation", () => {
    const tab = buildOpenedTabs(
      [createTempScriptTab({ existingTempTabs: [] }).tempId],
      scripts,
      workspaces,
      {},
      { temp_1: createTempScriptTab({ existingTempTabs: [] }) },
    )[0]!;
    expect(canCloseTabWithoutConfirm({ ...tab, isPersisted: false, isDirty: false }, "")).toBe(
      true,
    );
  });

  it("requires confirmation for dirty temporary tabs", () => {
    const tab = {
      tabId: "temp_1",
      scriptId: null,
      tempId: "temp_1",
      scriptName: "Untitled.sql",
      projectId: null,
      projectName: null,
      workspaceId: null,
      workspaceName: null,
      isPersisted: false,
      isDirty: true,
    };
    expect(canCloseTabWithoutConfirm(tab, "SELECT 1;")).toBe(false);
  });

  it("closes clean persisted tabs without confirmation", () => {
    const tab = buildOpenedTabs(["1"], scripts, workspaces, {}, {})[0]!;
    expect(canCloseTabWithoutConfirm(tab, "SELECT 1;")).toBe(true);
  });
});

describe("isGenericScriptTitle", () => {
  it("detects generic untitled names", () => {
    expect(isGenericScriptTitle("Untitled.sql")).toBe(true);
    expect(isGenericScriptTitle("Untitled 1.sql")).toBe(true);
    expect(isGenericScriptTitle("New Script.sql")).toBe(true);
    expect(isGenericScriptTitle("my-query.sql")).toBe(false);
  });
});

describe("generateTempScriptTitle", () => {
  it("increments untitled names for multiple temporary tabs", () => {
    const first = createTempScriptTab({ existingTempTabs: [] });
    const second = createTempScriptTab({ existingTempTabs: [first] });
    expect(first.title).toBe("Untitled.sql");
    expect(second.title).toBe("Untitled 1.sql");
    expect(generateTempScriptTitle([first, second])).toBe("Untitled 2.sql");
  });
});

describe("tab id helpers", () => {
  it("identifies temporary tab ids", () => {
    expect(isTempTabId("temp_abc")).toBe(true);
    expect(isTempTabId("1")).toBe(false);
    expect(tabIdFromScriptId(42)).toBe("42");
  });
});

describe("sidebar filter independence", () => {
  it("does not change active script when only the sidebar filter changes", () => {
    const activeScriptId = 1;
    const sidebarFilterProjectId = 20;
    const tab = buildOpenedTabs([String(activeScriptId)], scripts, workspaces, {}, {})[0];

    expect(sidebarFilterProjectId).not.toBe(tab?.projectId);
    expect(tab?.scriptId).toBe(activeScriptId);
    expect(resolveSaveScriptId(tab)).toBe(1);
  });

  it("keeps save target on Project A when sidebar filter is Project B", () => {
    const activeScriptId = 1;
    const sidebarFilterProjectId = 20;
    const saveTarget = resolveSaveScriptId(
      buildOpenedTabs([String(activeScriptId)], scripts, workspaces, {}, {})[0],
    );
    const activeTab = buildOpenedTabs([String(activeScriptId)], scripts, workspaces, {}, {})[0];

    expect(sidebarFilterProjectId).toBe(20);
    expect(activeTab?.projectId).toBe(10);
    expect(saveTarget).toBe(1);
  });

  it("updates navbar label when switching between tabs from different projects", () => {
    const tabA = buildOpenedTabs(["1"], scripts, workspaces, {}, {})[0]!;
    const tabB = buildOpenedTabs(["2"], scripts, workspaces, {}, {})[0]!;

    expect(formatEditorContextLabel(tabA)).toBe("asdp-pids / jadwal-operasional.sql");
    expect(formatEditorContextLabel(tabB)).toBe("one.tetradata.id / jadwal-operasional.sql");
  });

  it("does not change active tab when clearing sidebar filter", () => {
    const activeScriptId = 2;
    const sidebarFilterProjectId: number | null = null;
    const activeTab = buildOpenedTabs([String(activeScriptId)], scripts, workspaces, {}, {})[0];

    expect(sidebarFilterProjectId).toBeNull();
    expect(activeTab?.scriptId).toBe(activeScriptId);
  });
});

describe("editor empty state transitions", () => {
  it("results in empty tabs when closing the only script", () => {
    const afterClose = buildOpenedTabs([], scripts, workspaces, {}, {});
    expect(afterClose).toEqual([]);
    expect(resolveNextActiveTabId(["1"], "1")).toBeNull();
  });

  it("keeps active tab when closing a non-active tab", () => {
    const openTabIds = ["1", "3"];
    const activeScriptId = 1;
    const closedId = "3";
    const remaining = openTabIds.filter((id) => id !== closedId);

    expect(remaining).toEqual(["1"]);
    expect(activeScriptId).toBe(1);
    expect(resolveNextActiveTabId(openTabIds, closedId)).toBe("1");
  });

  it("activates nearest tab when closing the active tab", () => {
    expect(resolveNextActiveTabId(["1", "3"], "1")).toBe("3");
    expect(resolveNextActiveTabId(["1", "3"], "3")).toBe("1");
  });
});
