import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { WorkspaceEnv } from "@/stores/workspace-store";

const ENV_BADGE: Record<
  WorkspaceEnv,
  { dot: string; pill: string; label: string; short: string }
> = {
  Development: {
    dot: "bg-env-dev",
    pill: "bg-env-dev/12 text-env-dev border-env-dev/20",
    label: "Development",
    short: "Dev",
  },
  Staging: {
    dot: "bg-env-staging",
    pill: "bg-env-staging/12 text-env-staging border-env-staging/25",
    label: "Staging",
    short: "Stg",
  },
  Production: {
    dot: "bg-env-prod",
    pill: "bg-env-prod/12 text-env-prod border-env-prod/25",
    label: "Production",
    short: "Prod",
  },
};

type EnvironmentBadgeProps = {
  env: WorkspaceEnv;
  className?: string;
};

export function EnvironmentBadge({ env, className }: EnvironmentBadgeProps) {
  const meta = ENV_BADGE[env];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex h-7 max-w-36 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium leading-none shrink-0",
            meta.pill,
            className,
          )}
        >
          <span className={cn("size-1.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
          <span className="truncate sm:hidden">{meta.short}</span>
          <span className="truncate hidden sm:inline">{meta.label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        Environment follows the selected sidebar connection
      </TooltipContent>
    </Tooltip>
  );
}
