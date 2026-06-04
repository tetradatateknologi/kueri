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
      { label: "Edit script name & tags", keys: formatShortcut("S", { shift: true }) },
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
      { label: "Cycle database connection", keys: formatShortcut("E") },
      { label: "Query history", keys: formatShortcut("H") },
      { label: "Switch to tab N", keys: `${formatShortcut("1")} … ${formatShortcut("9")}` },
      { label: "Next / previous tab", keys: `${formatShortcut("]")} / ${formatShortcut("[")}` },
      { label: "Open settings & guide", keys: "?" },
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
      "Pilih workspace dan koneksi database di sidebar kiri — lingkungan (dev / staging / prod) mengikuti koneksi yang dipilih.",
      "Buka atau buat script SQL di tab editor. Jalankan query dengan Run Query atau ⌘↵.",
      "Hasil tampil di panel bawah (tabel atau JSON). Gunakan Smart Export untuk mengekspor hasil.",
      "Query history menyimpan 10 run terakhir di browser ini (lokal).",
    ],
  },
  {
    id: "safety",
    title: "Production",
    body: [
      "Saat memilih koneksi production, konfirmasi dialog akan muncul sebelum query dijalankan.",
      "Periksa SQL dengan teliti sebelum menjalankan perintah destruktif di lingkungan live.",
    ],
  },
  {
    id: "shortcuts",
    title: "Pintasan",
    body: [
      "Tekan ? di workspace untuk membuka Settings pada bagian panduan ini.",
      "Semua pintasan juga tersedia di menu Settings di sidebar.",
    ],
  },
] as const;
