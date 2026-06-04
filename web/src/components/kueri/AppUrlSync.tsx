import { useEffect, useRef } from "react";

import { useAppView } from "@/context/app-view";
import { useAppUrl, useProjectWorkspaceId } from "@/context/app-url";
import { useKueriApp } from "@/context/kueri-app";
import { useSelectConnection } from "@/context/select-connection";
import {
  findConnectionInWorkspaces,
  findScriptWorkspaceId,
  readAppUrlFromLocation,
  resolveWorkspaceByProjectParam,
  writeAppUrl,
} from "@/lib/app-url";
import type { SelectedConnection } from "@/stores/workspace-store";
import type { Workspace } from "@/lib/api/types";
import { useWorkspaceStore } from "@/stores/workspace-store";

function toSelectedConnection(
  workspace: Pick<Workspace, "id" | "name">,
  conn: Workspace["connections"][number],
): SelectedConnection {
  return {
    connectionId: conn.id,
    projectId: String(workspace.id),
    projectName: workspace.name,
    env: conn.env_key,
    label: conn.name,
    host: conn.display_host,
  };
}

export function AppUrlSync() {
  const { workspaces, scripts, isLoading, openScript, activeScriptId } = useKueriApp();
  const { snapshot, historyEpoch, setProjectFilter } = useAppUrl();
  const projectWorkspaceId = useProjectWorkspaceId(workspaces);
  const selectedConnectionId = useWorkspaceStore((s) => s.selectedConnection?.connectionId);
  const { selectConnection } = useSelectConnection();
  const { openSettings, openWorkspace } = useAppView();

  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (isLoading || workspaces.length === 0) return;
    if (snapshot.project && projectWorkspaceId == null) {
      if (!resolveWorkspaceByProjectParam(snapshot.project, workspaces)) {
        writeAppUrl({ project: null });
      }
    }
  }, [isLoading, workspaces, snapshot.project, projectWorkspaceId]);

  useEffect(() => {
    if (isLoading || bootstrappedRef.current) return;

    const url = readAppUrlFromLocation();

    if (url.scriptId != null && !scripts.some((s) => s.id === url.scriptId)) {
      return;
    }

    if (url.view === "settings") {
      openSettings(url.settingsSection ?? "guide");
    }

    if (url.connectionId != null) {
      const found = findConnectionInWorkspaces(url.connectionId, workspaces);
      if (found) {
        selectConnection(toSelectedConnection(found.workspace, found.connection));
      }
    } else if (projectWorkspaceId != null) {
      const ws = workspaces.find((w) => w.id === projectWorkspaceId);
      const conn = ws?.connections[0];
      if (ws && conn) {
        selectConnection(toSelectedConnection(ws, conn));
      }
    }

    if (url.scriptId != null) {
      openScript(url.scriptId);
    } else if (projectWorkspaceId != null) {
      const firstInProject = scripts.find((s) => s.workspace_id === projectWorkspaceId);
      if (firstInProject) openScript(firstInProject.id);
    }

    bootstrappedRef.current = true;
  }, [
    isLoading,
    workspaces,
    scripts,
    projectWorkspaceId,
    openScript,
    selectConnection,
    openSettings,
  ]);

  useEffect(() => {
    if (snapshot.view === "settings") {
      openSettings(snapshot.settingsSection ?? "guide");
      return;
    }
    openWorkspace();
  }, [snapshot.view, snapshot.settingsSection, openSettings, openWorkspace]);

  useEffect(() => {
    if (!bootstrappedRef.current) return;

    const url = readAppUrlFromLocation();

    if (
      url.scriptId != null &&
      url.scriptId !== activeScriptId &&
      scripts.some((s) => s.id === url.scriptId)
    ) {
      openScript(url.scriptId);
    }

    if (url.connectionId != null && url.connectionId !== selectedConnectionId) {
      const found = findConnectionInWorkspaces(url.connectionId, workspaces);
      if (found) {
        selectConnection(toSelectedConnection(found.workspace, found.connection));
      }
    }
  }, [
    historyEpoch,
    workspaces,
    scripts,
    activeScriptId,
    selectedConnectionId,
    openScript,
    selectConnection,
  ]);

  // Keep URL `project` in sync when the user switches script tabs — not when they
  // change the sidebar project filter (that would immediately revert their selection).
  useEffect(() => {
    if (activeScriptId == null) return;

    const scriptWorkspaceId = findScriptWorkspaceId(activeScriptId, scripts);
    if (scriptWorkspaceId == null) return;

    const ws = workspaces.find((w) => w.id === scriptWorkspaceId);
    if (ws) {
      setProjectFilter(ws);
    }
  }, [activeScriptId, scripts, workspaces, setProjectFilter]);

  return null;
}
