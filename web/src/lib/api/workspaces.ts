import { apiFetch } from "./http";
import type { Connection, ConnectionInput, Workspace } from "./types";

export function listWorkspaces() {
  return apiFetch<Workspace[]>("/api/v1/workspaces");
}

export function createWorkspace(body: { name: string }) {
  return apiFetch<Workspace>("/api/v1/workspaces", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createConnection(workspaceId: number, body: ConnectionInput) {
  return apiFetch<Connection>(`/api/v1/workspaces/${workspaceId}/connections`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function testConnection(workspaceId: number, body: ConnectionInput) {
  return apiFetch<{ ok: boolean }>(`/api/v1/workspaces/${workspaceId}/connections/test`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
