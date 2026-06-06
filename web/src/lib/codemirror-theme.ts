import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";

import type { ResolvedTheme } from "@/lib/theme";

const editorLayoutTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px" },
  ".cm-scroller": { fontFamily: "var(--font-mono)" },
  ".cm-content": { padding: "12px 0" },
});

const lightEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--background)",
      color: "var(--foreground)",
    },
    ".cm-content": { caretColor: "var(--foreground)" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--foreground)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground":
      {
        backgroundColor: "color-mix(in oklab, var(--electric) 22%, transparent)",
      },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in oklab, var(--foreground) 4%, transparent)",
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      borderRight: "1px solid var(--border)",
      color: "var(--muted-foreground)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "color-mix(in oklab, var(--foreground) 4%, transparent)",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      color: "var(--muted-foreground)",
    },
  },
  { dark: false },
);

export function getEditorThemeExtensions(resolvedTheme: ResolvedTheme) {
  if (resolvedTheme === "dark") {
    return [oneDark, editorLayoutTheme];
  }
  return [lightEditorTheme, editorLayoutTheme];
}
