import type { Script } from "@/lib/api/types";

export function getFavoriteScripts(scripts: Script[]): Script[] {
  return scripts
    .filter((s) => s.is_favorite)
    .sort((a, b) => (a.favorite_sort ?? 0) - (b.favorite_sort ?? 0));
}
