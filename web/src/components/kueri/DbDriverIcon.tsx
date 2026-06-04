import { DRIVER_META } from "@/components/kueri/connection-meta";
import type { ConnectionDriver } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type DbDriverIconProps = {
  driver: ConnectionDriver;
  className?: string;
};

export function DbDriverIcon({ driver, className }: DbDriverIconProps) {
  const meta = DRIVER_META[driver];

  return (
    <img
      src={meta.icon}
      alt=""
      width={36}
      height={36}
      draggable={false}
      className={cn("size-9 shrink-0 object-contain", className)}
    />
  );
}
