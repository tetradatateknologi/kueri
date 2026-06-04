import { apiFetch } from "./http";

export type UpdateCheckResult = {
  current_version: string;
  latest_version: string;
  update_available: boolean;
  force_update: boolean;
  release_notes_url: string;
  download_url?: string;
  sha256?: string;
  size?: number;
  platform: string;
  manifest_url: string;
};

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  return apiFetch<UpdateCheckResult>("/api/v1/updates/check");
}
