/** Returns true when the event target is a plain text field (not the SQL editor). */
export function isTypingInFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest(".cm-editor")) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function isInDialog(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest('[role="dialog"]') ||
      target.closest('[role="alertdialog"]') ||
      target.closest('[data-slot="sheet-content"]'),
  );
}

export function isModKey(e: { metaKey: boolean; ctrlKey: boolean }): boolean {
  return e.metaKey || e.ctrlKey;
}

export function shouldIgnoreWorkspaceHotkey(e: KeyboardEvent): boolean {
  if (isInDialog(e.target)) return true;
  if (isTypingInFormField(e.target)) return true;
  return false;
}

export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}

/** e.g. "⌘S" or "Ctrl+S" */
export function formatShortcut(key: string, modifiers?: { shift?: boolean; alt?: boolean }): string {
  const mac = isMac();
  if (key === "Enter") {
    return mac ? "⌘↵" : "Ctrl+Enter";
  }
  if (modifiers?.alt) {
    const alt = mac ? "⌥" : "Alt+";
    const mod = mac ? "⌘" : "Ctrl+";
    return mac ? `${mod}${alt}${key}` : `${alt}${mod}${key}`;
  }
  if (modifiers?.shift) {
    return mac ? `⌘⇧${key.toUpperCase()}` : `Ctrl+Shift+${key.toUpperCase()}`;
  }
  return mac ? `⌘${key.toUpperCase()}` : `Ctrl+${key.toUpperCase()}`;
}
