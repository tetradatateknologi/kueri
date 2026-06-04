import { formatShortcut } from "@/lib/hotkeys";

export type KeyboardShortcutItem = {
  label: string;
  keys: string;
  description?: string;
};

export type KeyboardShortcutGroup = {
  id: string;
  title: string;
  description?: string;
  items: KeyboardShortcutItem[];
};

export const KEYBOARD_SHORTCUT_GROUPS: KeyboardShortcutGroup[] = [
  {
    id: "editor",
    title: "Editor & queries",
    description: "Active in the SQL workspace. Disabled while typing in forms or dialogs.",
    items: [
      { label: "Run query", keys: formatShortcut("Enter") },
      { label: "Save script", keys: formatShortcut("S") },
      { label: "Rename active script", keys: formatShortcut("F2") },
      {
        label: "Edit script name & tags",
        keys: formatShortcut("E"),
        description: "While the SQL editor is focused; also ⌘⇧S / Ctrl+Shift+S",
      },
      {
        label: "Toggle favorite",
        keys: formatShortcut("B", { shift: true }),
        description: "Adds or removes the active script from Favorites",
      },
      { label: "New script tab", keys: formatShortcut("N"), description: "Also ⌘T / Ctrl+T" },
      { label: "Close active tab", keys: formatShortcut("W") },
      { label: "Toggle SQL line comment", keys: formatShortcut("/"), description: "When the editor is focused" },
    ],
  },
  {
    id: "navigation",
    title: "Navigation",
    items: [
      { label: "Toggle sidebar", keys: formatShortcut("B") },
      { label: "Focus sidebar search", keys: formatShortcut("F", { shift: true }) },
      {
        label: "Cycle database connection",
        keys: formatShortcut("E"),
        description: "When the SQL editor is not focused",
      },
      { label: "Query history", keys: formatShortcut("H") },
      { label: "Switch to tab N", keys: `${formatShortcut("1")} … ${formatShortcut("9")}` },
      { label: "Next / previous tab", keys: `${formatShortcut("]")} / ${formatShortcut("[")}` },
    ],
  },
  {
    id: "results",
    title: "Results panel",
    items: [
      { label: "Results view", keys: formatShortcut("1", { alt: true }) },
      { label: "JSON view", keys: formatShortcut("3", { alt: true }) },
      { label: "Smart export", keys: formatShortcut("E", { shift: true }), description: "When results are available" },
    ],
  },
];

export const USAGE_GUIDE_SECTIONS = [
  {
    id: "workflow",
    title: "Workflow",
    body: [
      "Select a workspace and database connection in the left sidebar — environment (dev / staging / prod) follows the selected connection.",
      "Open or create SQL scripts in the editor tabs. Run queries with Run Query or ⌘↵.",
      "Results appear in the bottom panel (table or JSON). Use Smart Export to export results.",
      "Query history stores the last 10 runs in this browser (local only).",
    ],
  },
  {
    id: "safety",
    title: "Production",
    body: [
      "When you select a production connection, a confirmation dialog appears before the query runs.",
      "Review SQL carefully before running destructive statements in a live environment.",
    ],
  },
  {
    id: "shortcuts",
    title: "Shortcuts",
    body: [
      "All shortcuts are listed under Settings in the sidebar, in Guide and Keyboard shortcuts.",
    ],
  },
] as const;
