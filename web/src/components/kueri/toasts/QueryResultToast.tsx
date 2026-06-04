import { CheckCircle2 } from "lucide-react";

import { ToastBadge, ToastShell } from "@/components/kueri/toasts/ToastShell";

type QueryResultToastProps = {
  rowCount: number;
  durationMs: number;
  cached?: boolean;
  onDismiss?: () => void;
};

export function QueryResultToast({ rowCount, durationMs, cached, onDismiss }: QueryResultToastProps) {
  return (
    <ToastShell
      icon={<CheckCircle2 className="size-4 text-neon" strokeWidth={2.25} />}
      iconClassName="bg-neon/10 ring-1 ring-neon/25"
      title="Query finished"
      onDismiss={onDismiss}
    >
      <div className="flex flex-wrap gap-1.5">
        <ToastBadge className="border-neon/30 bg-neon/10 text-neon">
          {rowCount} {rowCount === 1 ? "row" : "rows"}
        </ToastBadge>
        <ToastBadge className="border-electric/30 bg-electric/10 text-electric">
          {durationMs}ms
        </ToastBadge>
        {cached && (
          <ToastBadge className="border-border bg-surface-2 text-muted-foreground">cached</ToastBadge>
        )}
      </div>
    </ToastShell>
  );
}
