import { useEffect, useRef } from "react";

import { isModKey, shouldIgnoreWorkspaceHotkey } from "@/lib/hotkeys";

export type KueriHotkeyHandlers = {
  onRun: () => void;
  onSave: () => void;
  onNewTab: () => void;
  onCloseTab: () => void;
  onEditScript: () => void;
  onRenameScript: () => void;
  onToggleFavorite: () => void;
  onHistory: () => void;
  onExport: () => void;
  onFocusSidebarSearch: () => void;
  onCycleConnection: () => void;
  onNextTab: () => void;
  onPrevTab: () => void;
  onSwitchTab: (index: number) => void;
  onResultsView: (view: "results" | "json") => void;
};

export function useKueriHotkeys(handlers: KueriHotkeyHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const h = handlersRef.current;

      if (shouldIgnoreWorkspaceHotkey(e)) return;

      if (e.key === "F2" && !isModKey(e) && !e.altKey) {
        e.preventDefault();
        h.onRenameScript();
        return;
      }

      const mod = isModKey(e);

      if (mod && e.key === "Enter") {
        e.preventDefault();
        h.onRun();
        return;
      }

      if (!mod) return;

      const key = e.key.toLowerCase();

      if (key === "b" && e.shiftKey) {
        e.preventDefault();
        h.onToggleFavorite();
        return;
      }

      if (key === "s" && e.shiftKey) {
        e.preventDefault();
        h.onEditScript();
        return;
      }

      if (key === "s") {
        e.preventDefault();
        h.onSave();
        return;
      }

      if (key === "n" || key === "t") {
        e.preventDefault();
        h.onNewTab();
        return;
      }

      if (key === "w") {
        e.preventDefault();
        h.onCloseTab();
        return;
      }

      if (key === "h") {
        e.preventDefault();
        h.onHistory();
        return;
      }

      if (key === "e" && e.shiftKey) {
        e.preventDefault();
        h.onExport();
        return;
      }

      if (key === "e") {
        e.preventDefault();
        h.onCycleConnection();
        return;
      }

      if (key === "f" && e.shiftKey) {
        e.preventDefault();
        h.onFocusSidebarSearch();
        return;
      }

      if (e.altKey && (key === "1" || key === "3")) {
        e.preventDefault();
        h.onResultsView(key === "1" ? "results" : "json");
        return;
      }

      if (key >= "1" && key <= "9" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        h.onSwitchTab(Number(key) - 1);
        return;
      }

      if (key === "]" || e.key === "}") {
        e.preventDefault();
        h.onNextTab();
        return;
      }

      if (key === "[" || e.key === "{") {
        e.preventDefault();
        h.onPrevTab();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
