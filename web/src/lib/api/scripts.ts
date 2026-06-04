import { apiFetch } from "./http";
import type { QueryRunResult, Script } from "./types";

export function listScripts() {
  return apiFetch<Script[]>("/api/v1/scripts");
}

export function getScript(id: number) {
  return apiFetch<Script>(`/api/v1/scripts/${id}`);
}

export function updateScript(id: number, body: { title?: string; sql_text?: string }) {
  return apiFetch<Script>(`/api/v1/scripts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function createScript(body: { workspace_id: number; title: string; sql_text?: string }) {
  return apiFetch<Script>("/api/v1/scripts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function runQuery(sql_text: string) {
  return apiFetch<QueryRunResult>("/api/v1/query/run", {
    method: "POST",
    body: JSON.stringify({ sql_text }),
  });
}
