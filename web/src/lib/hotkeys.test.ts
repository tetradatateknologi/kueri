import { describe, expect, it } from "vitest";

import {
  isInDialog,
  isInSqlEditor,
  isModKey,
  isTypingInFormField,
  shouldIgnoreWorkspaceHotkey,
} from "./hotkeys";

describe("hotkeys", () => {
  it("detects mod key", () => {
    expect(isModKey({ metaKey: true, ctrlKey: false })).toBe(true);
    expect(isModKey({ metaKey: false, ctrlKey: true })).toBe(true);
    expect(isModKey({ metaKey: false, ctrlKey: false })).toBe(false);
  });

  it("ignores plain inputs but not cm-editor", () => {
    const input = document.createElement("input");
    expect(isTypingInFormField(input)).toBe(true);

    const wrap = document.createElement("div");
    wrap.className = "cm-editor";
    const inner = document.createElement("div");
    wrap.appendChild(inner);
    document.body.appendChild(wrap);
    expect(isTypingInFormField(inner)).toBe(false);
    wrap.remove();
  });

  it("detects sql editor ancestry", () => {
    const editor = document.createElement("div");
    editor.className = "cm-editor";
    const content = document.createElement("div");
    content.className = "cm-content";
    editor.appendChild(content);
    expect(isInSqlEditor(content)).toBe(true);
    expect(isInSqlEditor(document.body)).toBe(false);
  });

  it("detects dialog ancestry", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const btn = document.createElement("button");
    dialog.appendChild(btn);
    expect(isInDialog(btn)).toBe(true);
  });

  it("shouldIgnoreWorkspaceHotkey when in input", () => {
    const input = document.createElement("input");
    const event = new KeyboardEvent("keydown", { key: "s", bubbles: true });
    Object.defineProperty(event, "target", { value: input });
    expect(shouldIgnoreWorkspaceHotkey(event)).toBe(true);
  });
});
