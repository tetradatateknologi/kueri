import type { ConnectionDriver } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type DbDriverIconProps = {
  driver: ConnectionDriver;
  className?: string;
};

export function DbDriverIcon({ driver, className }: DbDriverIconProps) {
  if (driver === "mysql") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7 shrink-0", className)}>
        <rect width="32" height="32" rx="6" fill="#00758F" fillOpacity="0.15" />
        <path
          d="M16 6c-4.5 0-8 1.8-8 4v12c0 2.2 3.5 4 8 4s8-1.8 8-4V10c0-2.2-3.5-4-8-4zm0 2c3.5 0 6 .9 6 2s-2.5 2-6 2-6-.9-6-2 2.5-2 6-2zm-6 5.5c1.8 1 3.9 1.5 6 1.5s4.2-.5 6-1.5V18c0 1.1-2.5 2-6 2s-6-.9-6-2v-4.5zm0 6c1.8 1 3.9 1.5 6 1.5s4.2-.5 6-1.5V22c0 1.1-2.5 2-6 2s-6-.9-6-2v-2.5z"
          fill="#F29111"
        />
        <path d="M16 8c-3.5 0-6 .9-6 2s2.5 2 6 2 6-.9 6-2-2.5-2-6-2z" fill="#00758F" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7 shrink-0", className)}>
      <rect width="32" height="32" rx="6" fill="#336791" fillOpacity="0.15" />
      <path
        d="M23.5 14.2c.3-1 .4-1.8.4-2.5 0-1.2-.3-2.1-.8-2.8-.6-.8-1.5-1.3-2.7-1.6-1.1-.3-2.5-.4-4.1-.4H8.5v16h5.8c1.8 0 3.2-.2 4.3-.6 1.1-.4 2-1 2.5-1.8.6-.9.9-2 .9-3.3 0-1.1-.2-2-.7-2.7-.5-.7-1.2-1.2-2.1-1.5 1-.3 1.7-.8 2.2-1.5.5-.7.8-1.6.8-2.7 0-.5-.1-1-.2-1.5zm-3.8-5.5c.6.2 1 .5 1.3.9.3.4.4 1 .4 1.7 0 .7-.2 1.3-.5 1.7-.4.5-.9.8-1.6 1-.7.2-1.6.3-2.7.3h-2.8V8.3h3.4c1.1 0 2 .1 2.5.4zm.6 8.5c.5.3.9.7 1.1 1.2.2.5.3 1.1.3 1.8 0 .8-.2 1.4-.5 1.9-.4.5-.9.9-1.6 1.1-.7.2-1.6.3-2.7.3h-3.1v-6.8h3.2c1.1 0 2 .1 2.6.4l-.3-.9z"
        fill="#336791"
      />
    </svg>
  );
}
