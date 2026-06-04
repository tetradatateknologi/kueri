import { apiFetch } from "./http";
import type { User } from "./types";

export function getMe() {
  return apiFetch<User>("/api/v1/me");
}
