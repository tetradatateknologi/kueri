import { CheckCircle2 } from "lucide-react";

import { ToastShell } from "@/components/kueri/toasts/ToastShell";

type SuccessToastProps = {
  message: string;
  onDismiss?: () => void;
};

export function SuccessToast({ message, onDismiss }: SuccessToastProps) {
  return (
    <ToastShell
      icon={<CheckCircle2 className="size-4 text-neon" strokeWidth={2.25} />}
      iconClassName="bg-neon/10 ring-1 ring-neon/25"
      title={message}
      onDismiss={onDismiss}
    />
  );
}
