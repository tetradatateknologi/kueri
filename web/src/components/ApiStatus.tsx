import { useHealthQuery, usePingQuery } from "@/lib/api/queries";

export function ApiStatus() {
  if (!import.meta.env.DEV) {
    return null;
  }

  const health = useHealthQuery();
  const ping = usePingQuery();

  const loading = health.isLoading || ping.isLoading;
  const error = health.error ?? ping.error;
  const ok = health.data && ping.data;

  return (
    <div
      className="fixed bottom-3 right-3 z-50 rounded-md border border-border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-md backdrop-blur"
      aria-live="polite"
    >
      {loading && <span>API: checking…</span>}
      {error && !loading && (
        <span className="text-destructive">
          API: {error instanceof Error ? error.message : "unreachable"}
        </span>
      )}
      {ok && !loading && !error && (
        <span>
          API: health={health.data.status}, ping={ping.data.message}
        </span>
      )}
    </div>
  );
}
