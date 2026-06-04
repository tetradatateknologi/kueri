import { apiFetch } from "./http";

export type VersionInfo = {
  version: string;
  mode: "server" | "desktop" | string;
  schema_version: number;
};

export async function fetchVersion(): Promise<VersionInfo> {
  return apiFetch<VersionInfo>("/version");
}
