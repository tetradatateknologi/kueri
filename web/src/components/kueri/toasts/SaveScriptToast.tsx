import { Save } from "lucide-react";

import { ToastShell } from "@/components/kueri/toasts/ToastShell";

type SaveScriptToastProps = {
  title?: string;
  local?: boolean;
  onDismiss?: () => void;
};

export function SaveScriptToast({ title, local, onDismiss }: SaveScriptToastProps) {
  const label = local
    ? "Saved to local library"
    : title
      ? `Saved "${title}"`
      : "Script saved";

  return (
    <ToastShell
      icon={<Save className="size-4 text-electric" strokeWidth={2.25} />}
      iconClassName="bg-electric/10 ring-1 ring-electric/25"
      title={label}
      onDismiss={onDismiss}
    >
      <p className="text-[11px] text-muted-foreground">
        {local ? "Stored in browser for quick access" : "Changes synced to workspace"}
      </p>
    </ToastShell>
  );
}
