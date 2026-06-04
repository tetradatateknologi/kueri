import { useEffect, useState } from "react";
import { fetchHealth, fetchPing } from "@/lib/api/client";

type ApiState =
  | { kind: "loading" }
  | { kind: "ok"; health: string; ping: string }
  | { kind: "error"; message: string };

export function ApiStatus() {
  const [state, setState] = useState<ApiState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [health, ping] = await Promise.all([fetchHealth(), fetchPing()]);
        if (!cancelled) {
          setState({
            kind: "ok",
            health: health.status,
            ping: ping.message,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : "API unreachable",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed bottom-3 right-3 z-50 rounded-md border border-border bg-card/95 px-3 py-2 text-xs text-muted-foreground shadow-md backdrop-blur"
      aria-live="polite"
    >
      {state.kind === "loading" && <span>API: checking…</span>}
      {state.kind === "ok" && (
        <span>
          API: health={state.health}, ping={state.ping}
        </span>
      )}
      {state.kind === "error" && <span className="text-destructive">API: {state.message}</span>}
    </div>
  );
}
