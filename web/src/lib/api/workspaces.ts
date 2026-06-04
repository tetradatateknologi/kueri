import { apiFetch } from "./http";
import type { Workspace } from "./types";

export function listWorkspaces() {
  return apiFetch<Workspace[]>("/api/v1/workspaces");
}
