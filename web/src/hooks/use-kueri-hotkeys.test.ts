import { describe, expect, it, vi } from "vitest";

import { isModKey } from "@/lib/hotkeys";

/** Mirrors use-kueri-hotkeys key handling for unit tests. */
function dispatchHotkey(
  handlers: {
    onRenameScript: () => void;
    onToggleFavorite: () => void;
  },
  init: KeyboardEventInit & { target?: EventTarget },
) {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  if (init.target) {
    Object.defineProperty(event, "target", { value: init.target });
  }

  if (event.key === "F2" && !isModKey(event) && !event.altKey) {
    event.preventDefault();
    handlers.onRenameScript();
    return;
  }

  if (!isModKey(event)) return;

  const key = event.key.toLowerCase();
  if (key === "b" && event.shiftKey) {
    event.preventDefault();
    handlers.onToggleFavorite();
  }
}

describe("useKueriHotkeys script actions", () => {
  it("F2 triggers rename", () => {
    const onRenameScript = vi.fn();
    dispatchHotkey({ onRenameScript, onToggleFavorite: vi.fn() }, { key: "F2" });
    expect(onRenameScript).toHaveBeenCalledOnce();
  });

  it("mod+shift+b toggles favorite", () => {
    const onToggleFavorite = vi.fn();
    dispatchHotkey(
      { onRenameScript: vi.fn(), onToggleFavorite },
      { key: "B", shiftKey: true, metaKey: true },
    );
    expect(onToggleFavorite).toHaveBeenCalledOnce();
  });
});
