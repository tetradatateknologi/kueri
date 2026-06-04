import { useEffect } from "react";

type WorkspaceHotkeysOptions = {
  onRun: () => void;
  onToggleEnv: () => void;
  onCloseEnv: () => void;
  envOpen: boolean;
};

export function useWorkspaceHotkeys({
  onRun,
  onToggleEnv,
  onCloseEnv,
  envOpen,
}: WorkspaceHotkeysOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
      const inDialog = Boolean(target.closest('[role="dialog"]'));

      if (e.key === "Escape" && envOpen) {
        e.preventDefault();
        onCloseEnv();
        return;
      }

      if (inDialog) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "Enter") {
        e.preventDefault();
        onRun();
        return;
      }

      if (mod && (e.key === "e" || e.key === "E") && !inInput) {
        e.preventDefault();
        onToggleEnv();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRun, onToggleEnv, onCloseEnv, envOpen]);
}
