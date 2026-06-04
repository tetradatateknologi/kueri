const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${apiBase}/health`);
  if (!res.ok) {
    throw new Error(`health check failed: ${res.status}`);
  }
  return res.json() as Promise<{ status: string }>;
}

export async function fetchPing(): Promise<{ message: string }> {
  const res = await fetch(`${apiBase}/ping`);
  if (!res.ok) {
    throw new Error(`ping failed: ${res.status}`);
  }
  return res.json() as Promise<{ message: string }>;
}
