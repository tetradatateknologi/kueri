import type { QueryHistoryEntry, ResultsView, WorkspaceEnv } from "@/stores/workspace-store";

export const BACKUP_FORMAT = "kueri-backup" as const;
export const BACKUP_FORMAT_VERSION = 1;

export type BackupUser = {
  name: string;
  email: string;
};

export type BackupConnection = {
  name: string;
  environment: string;
  driver: string;
  host: string;
  port: number;
  database_name: string;
  username?: string;
  password?: string;
  ssl_mode: string;
};

export type BackupScript = {
  title: string;
  sql_text: string;
  tags: string[];
  is_favorite: boolean;
  favorite_sort?: number | null;
};

export type BackupWorkspace = {
  name: string;
  connections: BackupConnection[];
  scripts: BackupScript[];
};

export type BackupWorkspaceUiSettings = {
  env?: WorkspaceEnv;
  query_history?: QueryHistoryEntry[];
  results_view?: ResultsView;
};

export type BackupSettings = {
  workspace_ui?: BackupWorkspaceUiSettings;
};

/** Server + client unified backup file written to disk. */
export type KueriBackupFile = {
  format: typeof BACKUP_FORMAT;
  format_version: number;
  exported_at: string;
  app_version?: string;
  user: BackupUser;
  workspaces: BackupWorkspace[];
  settings?: BackupSettings;
};

export type BackupImportMode = "merge" | "replace";

export type BackupImportResult = {
  mode: BackupImportMode;
  workspaces: number;
  connections: number;
  scripts: number;
  skipped: number;
};
