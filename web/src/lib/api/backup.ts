import { apiFetch } from "./http";
import type { BackupImportMode, BackupImportResult, KueriBackupFile } from "@/lib/backup/types";

export async function exportBackupData(): Promise<Omit<KueriBackupFile, "settings">> {
  return apiFetch<Omit<KueriBackupFile, "settings">>("/api/v1/backup/export");
}

export async function importBackupData(
  mode: BackupImportMode,
  backup: Omit<KueriBackupFile, "settings">,
): Promise<BackupImportResult> {
  return apiFetch<BackupImportResult>("/api/v1/backup/import", {
    method: "POST",
    body: JSON.stringify({ mode, backup }),
  });
}
