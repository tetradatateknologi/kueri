import type { ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastShellProps = {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  children?: ReactNode;
  onDismiss?: () => void;
};

export function ToastShell({ icon, iconClassName, title, children, onDismiss }: ToastShellProps) {
  return (
    <div className="relative flex w-[min(calc(100vw-2rem),380px)] items-start gap-3 rounded-lg border border-border bg-surface-1/95 p-3.5 pr-10 shadow-lg backdrop-blur-sm ring-1 ring-border/50">
      <div className={cn("shrink-0 rounded-md p-2", iconClassName)}>{icon}</div>
      <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
        <p className="text-sm font-medium leading-snug text-foreground">{title}</p>
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onDismiss}
          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-3.5" strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
}

export function ToastBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide",
        className,
      )}
    >
      {children}
    </span>
  );
}
