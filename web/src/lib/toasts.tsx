import type { ReactNode } from "react";
import { toast } from "sonner";

import { ExportToast } from "@/components/kueri/toasts/ExportToast";
import { QueryErrorToast } from "@/components/kueri/toasts/QueryErrorToast";
import { QueryResultToast } from "@/components/kueri/toasts/QueryResultToast";
import { SaveScriptToast } from "@/components/kueri/toasts/SaveScriptToast";
import { SuccessToast } from "@/components/kueri/toasts/SuccessToast";

const customToastOptions = {
  unstyled: true,
  className: "!bg-transparent !border-0 !shadow-none !p-0 !gap-0",
} as const;

function showCustomToast(render: (onDismiss: () => void) => ReactNode) {
  toast.custom((id) => render(() => toast.dismiss(id)), customToastOptions);
}

export function showQueryResultToast(params: {
  rowCount: number;
  durationMs: number;
  cached?: boolean;
}) {
  showCustomToast((onDismiss) => <QueryResultToast {...params} onDismiss={onDismiss} />);
}

export function showQueryErrorToast(message: string, title?: string) {
  showCustomToast((onDismiss) => (
    <QueryErrorToast message={message} title={title} onDismiss={onDismiss} />
  ));
}

export function showSaveScriptToast(params: { title?: string; local?: boolean } = {}) {
  showCustomToast((onDismiss) => <SaveScriptToast {...params} onDismiss={onDismiss} />);
}

export function showExportToast(params: { filename: string; rowCount?: number }) {
  showCustomToast((onDismiss) => <ExportToast {...params} onDismiss={onDismiss} />);
}

export function showValidationError(message: string) {
  showQueryErrorToast(message, "Action blocked");
}

export function showSuccess(message: string) {
  showCustomToast((onDismiss) => <SuccessToast message={message} onDismiss={onDismiss} />);
}
