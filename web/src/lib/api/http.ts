import type { ExecuteQueryInput, QueryResult } from "./types";

const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<T> = {
  data?: T;
  error?: { code: string; message: string };
};

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const body = (await res.json().catch(() => ({}))) as Envelope<T>;

  if (!res.ok) {
    throw new ApiError(body.error?.message ?? res.statusText, res.status, body.error?.code);
  }

  if (body.data === undefined) {
    throw new ApiError("Empty API response", res.status);
  }

  return body.data;
}

export async function executeQuery(input: ExecuteQueryInput): Promise<QueryResult> {
  return apiFetch<QueryResult>("/query", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
