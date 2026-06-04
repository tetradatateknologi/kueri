import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type WorkspaceEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  hint: string;
  action?: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

export function WorkspaceEmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
  ...props
}: WorkspaceEmptyStateProps) {
  return (
    <div
      className={cn(
        "h-full flex flex-col items-center justify-center gap-3 text-muted-foreground p-6",
        className,
      )}
      {...props}
    >
      <Icon className="size-10 opacity-40" aria-hidden />
      <p className="text-sm">{title}</p>
      <p className="text-[11px] font-mono opacity-70">{hint}</p>
      {action}
    </div>
  );
}
