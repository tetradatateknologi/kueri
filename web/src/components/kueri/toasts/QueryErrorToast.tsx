import { AlertCircle } from "lucide-react";

import { ToastShell } from "@/components/kueri/toasts/ToastShell";

type QueryErrorToastProps = {
  message: string;
  title?: string;
  onDismiss?: () => void;
};

export function QueryErrorToast({ message, title = "Query failed", onDismiss }: QueryErrorToastProps) {
  return (
    <ToastShell
      icon={<AlertCircle className="size-4 text-destructive" strokeWidth={2.25} />}
      iconClassName="bg-destructive/10 ring-1 ring-destructive/25"
      title={title}
      onDismiss={onDismiss}
    >
      <p className="line-clamp-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {message}
      </p>
    </ToastShell>
  );
}
