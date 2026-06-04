import { apiFetch } from "./http";

export async function fetchHealth(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>("/health");
}

export async function fetchPing(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/ping");
}
