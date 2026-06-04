import { appVersion } from "@/lib/app-meta";
import type { KueriBackupFile } from "@/lib/backup/types";
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION } from "@/lib/backup/types";
import { useWorkspaceStore } from "@/stores/workspace-store";

export function collectLocalBackupSettings(): KueriBackupFile["settings"] {
  const { env, queryHistory, resultsView } = useWorkspaceStore.getState();
  return {
    workspace_ui: {
      env,
      query_history: queryHistory,
      results_view: resultsView,
    },
  };
}

export function applyLocalBackupSettings(settings: KueriBackupFile["settings"] | undefined) {
  const ui = settings?.workspace_ui;
  if (!ui) return;

  const store = useWorkspaceStore.getState();
  if (ui.env) store.setEnv(ui.env);
  if (ui.results_view) store.setResultsView(ui.results_view);
  if (ui.query_history) {
    useWorkspaceStore.setState({ queryHistory: ui.query_history });
  }
}

export function buildBackupFile(
  server: Omit<KueriBackupFile, "settings">,
  settings?: KueriBackupFile["settings"],
): KueriBackupFile {
  return {
    ...server,
    format: BACKUP_FORMAT,
    format_version: BACKUP_FORMAT_VERSION,
    app_version: server.app_version ?? appVersion,
    settings: settings ?? collectLocalBackupSettings(),
  };
}

export function parseBackupFile(raw: unknown): KueriBackupFile {
  if (!raw || typeof raw !== "object") {
    throw new Error("File cadangan tidak valid.");
  }
  const data = raw as Partial<KueriBackupFile>;
  if (data.format !== BACKUP_FORMAT) {
    throw new Error("Format cadangan tidak dikenali. Gunakan file ekspor Kueri (.json).");
  }
  if (data.format_version !== BACKUP_FORMAT_VERSION) {
    throw new Error(`Versi cadangan v${data.format_version} belum didukung.`);
  }
  if (!Array.isArray(data.workspaces)) {
    throw new Error("Struktur workspace pada cadangan tidak valid.");
  }
  return data as KueriBackupFile;
}

export function downloadBackupFile(backup: KueriBackupFile) {
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `kueri-backup-${stamp}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function toServerBackupPayload(backup: KueriBackupFile) {
  const { settings: _settings, ...rest } = backup;
  return rest;
}
