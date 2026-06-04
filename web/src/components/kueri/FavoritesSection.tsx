import { FileCode2, Star } from "lucide-react";

import { ScriptFavoriteButton } from "@/components/kueri/ScriptFavoriteButton";
import { SidebarItemMenu } from "@/components/kueri/SidebarItemMenu";
import type { Script } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type FavoritesSectionProps = {
  favorites: Script[];
  onOpenScript: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onEditScript: (id: number) => void;
  onDeleteScript: (script: Script) => void;
  isTogglingFavorite?: boolean;
};

export function FavoritesSection({
  favorites,
  onOpenScript,
  onToggleFavorite,
  onEditScript,
  onDeleteScript,
  isTogglingFavorite,
}: FavoritesSectionProps) {
  if (favorites.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="px-2 flex items-center gap-1.5 mb-1.5">
        <Star className="size-3 text-amber-400 fill-amber-400" />
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          Favorites
        </span>
      </div>
      <div className="space-y-0.5">
        {favorites.map((s) => (
          <div key={s.id} className="group flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onOpenScript(s.id)}
              className={cn(
                "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-surface-1 transition-colors min-w-0 text-left",
              )}
            >
              <FileCode2 className="size-3 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              <span className="truncate">{s.title}</span>
            </button>
            <ScriptFavoriteButton
              isFavorite
              disabled={isTogglingFavorite}
              onToggle={() => onToggleFavorite(s.id)}
              className="opacity-100"
            />
            <SidebarItemMenu
              className="mt-0"
              onEdit={() => onEditScript(s.id)}
              onDelete={() => onDeleteScript(s)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
