import { Loader2 } from "lucide-react";

import { KueriLogo } from "@/components/kueri/KueriLogo";
import { Button } from "@/components/ui/button";
import { appVersion } from "@/lib/app-meta";
import { cn } from "@/lib/utils";

type DesktopWelcomeScreenProps = {
  visible: boolean;
  exiting: boolean;
  apiReady: boolean;
  canContinue: boolean;
  onContinue: () => void;
};

export function DesktopWelcomeScreen({
  visible,
  exiting,
  apiReady,
  canContinue,
  onContinue,
}: DesktopWelcomeScreenProps) {
  if (!visible && !exiting) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex items-center justify-center bg-background transition-opacity duration-500 ease-out",
        exiting ? "opacity-0 pointer-events-none" : "opacity-100",
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-welcome-title"
      aria-describedby="desktop-welcome-desc"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,oklch(0.32_0.08_250/0.35),transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <div
        className={cn(
          "relative z-10 flex w-full max-w-md flex-col items-center px-8 text-center transition-all duration-500 ease-out",
          exiting ? "scale-[0.98] translate-y-1 opacity-0" : "scale-100 translate-y-0 opacity-100 animate-in fade-in zoom-in-95 duration-700",
        )}
      >
        <div className="mb-8 rounded-2xl border border-border/60 bg-surface-1/40 px-10 py-8 shadow-[0_0_60px_-12px] shadow-electric/25 backdrop-blur-sm">
          <KueriLogo
            size="xl"
            showWordmark
            className="flex-col items-center gap-4"
            wordmarkClassName="text-lg"
          />
        </div>

        <h1 id="desktop-welcome-title" className="sr-only">
          Welcome to Kueri
        </h1>

        <p id="desktop-welcome-desc" className="text-sm leading-relaxed text-muted-foreground">
          A modern database workspace for writing SQL, managing connections, and saving your scripts
          — fully offline on this device.
        </p>

        <p className="mt-3 font-mono text-[11px] text-muted-foreground/70">v{appVersion}</p>

        <div className="mt-10 flex min-h-10 flex-col items-center gap-3">
          {!canContinue ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-electric" aria-hidden />
              <span>{apiReady ? "Almost ready…" : "Starting up…"}</span>
            </div>
          ) : (
            <Button
              type="button"
              size="lg"
              className="min-w-40 bg-electric text-background hover:bg-electric/90"
              onClick={onContinue}
            >
              Get started
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
