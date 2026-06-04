import { Download } from "lucide-react";

import { ToastBadge, ToastShell } from "@/components/kueri/toasts/ToastShell";

type ExportToastProps = {
  filename: string;
  rowCount?: number;
  onDismiss?: () => void;
};

export function ExportToast({ filename, rowCount, onDismiss }: ExportToastProps) {
  return (
    <ToastShell
      icon={<Download className="size-4 text-neon" strokeWidth={2.25} />}
      iconClassName="bg-neon/10 ring-1 ring-neon/25"
      title="Export complete"
      onDismiss={onDismiss}
    >
      <p className="truncate font-mono text-[11px] text-neon">{filename}</p>
      {rowCount != null && (
        <div className="flex flex-wrap gap-1.5">
          <ToastBadge className="border-border bg-surface-2 text-muted-foreground">
            {rowCount} {rowCount === 1 ? "row" : "rows"}
          </ToastBadge>
        </div>
      )}
    </ToastShell>
  );
}
