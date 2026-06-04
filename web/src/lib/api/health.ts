import { apiFetch } from "./http";
import type { HealthResponse, PingResponse } from "./types";

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

export async function fetchPing(): Promise<PingResponse> {
  return apiFetch<PingResponse>("/ping");
}
