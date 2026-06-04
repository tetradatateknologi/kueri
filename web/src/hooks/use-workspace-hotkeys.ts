import { useEffect } from "react";

type WorkspaceHotkeysOptions = {
  onRun: () => void;
};

export function useWorkspaceHotkeys({ onRun }: WorkspaceHotkeysOptions) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const inDialog = Boolean(target.closest('[role="dialog"]'));

      if (inDialog) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        onRun();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRun]);
}
