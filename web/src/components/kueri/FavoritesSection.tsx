import { useMemo, useState } from "react";
import { ChevronRight, FileCode2, FolderGit2, Star } from "lucide-react";

import { ScriptFavoriteButton } from "@/components/kueri/ScriptFavoriteButton";
import { SidebarItemMenu } from "@/components/kueri/SidebarItemMenu";
import { groupFavoriteScriptsByWorkspace } from "@/lib/favorite-scripts";
import type { Script, Workspace } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type FavoritesSectionProps = {
  favorites: Script[];
  workspaces: Workspace[];
  onOpenScript: (id: number) => void;
  onToggleFavorite: (id: number) => void;
  onEditScript: (id: number) => void;
  onDeleteScript: (script: Script) => void;
  isTogglingFavorite?: boolean;
};

export function FavoritesSection({
  favorites,
  workspaces,
  onOpenScript,
  onToggleFavorite,
  onEditScript,
  onDeleteScript,
  isTogglingFavorite,
}: FavoritesSectionProps) {
  const groups = useMemo(
    () => groupFavoriteScriptsByWorkspace(favorites, workspaces),
    [favorites, workspaces],
  );
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});

  if (groups.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="px-2 flex items-center gap-1.5 mb-1.5">
        <Star className="size-3 text-amber-400 fill-amber-400" />
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          Favorites
        </span>
      </div>
      <div className="space-y-0.5">
        {groups.map(({ workspaceId, workspaceName, scripts }, index) => {
          const open = openGroups[workspaceId] ?? index === 0;
          return (
            <div key={workspaceId}>
              <button
                type="button"
                onClick={() => setOpenGroups((s) => ({ ...s, [workspaceId]: !open }))}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-surface-1 transition-colors min-w-0"
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform shrink-0",
                    open && "rotate-90",
                  )}
                />
                <FolderGit2 className="size-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{workspaceName}</span>
              </button>
              {open && (
                <div className="ml-6 mt-0.5 mb-1 space-y-0.5 border-l border-border/70 pl-2">
                  {scripts.map((s) => (
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
