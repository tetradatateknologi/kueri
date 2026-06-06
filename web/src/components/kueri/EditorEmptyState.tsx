import { FileCode2, Plus, Star } from "lucide-react";

import { WorkspaceEmptyState } from "@/components/kueri/WorkspaceEmptyState";
import { Button } from "@/components/ui/button";
import type { Script } from "@/lib/api/types";

type EditorEmptyStateProps = {
  favorites: Script[];
  onCreateScript: () => void;
  onOpenScript: (id: number) => void;
};

export function EditorEmptyState({ favorites, onCreateScript, onOpenScript }: EditorEmptyStateProps) {
  return (
    <WorkspaceEmptyState
      role="region"
      aria-label="SQL editor"
      className="bg-surface-1"
      icon={FileCode2}
      title="No script open"
      hint="Select a script from the sidebar or create a new SQL script to start."
      action={
        <div className="flex flex-col items-center gap-3 mt-1 w-full max-w-sm">
          {favorites.length > 0 && (
            <div className="w-full space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold flex items-center justify-center gap-1">
                <Star className="size-3 text-amber-400 fill-amber-400" />
                Favorites
              </p>
              <div className="flex flex-col gap-1">
                {favorites.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpenScript(s.id)}
                    className="w-full text-left px-3 py-2 rounded-md border border-border text-xs hover:bg-surface-2 transition-colors truncate font-mono"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={onCreateScript}
          >
            <Plus className="size-3.5" />
            New script
          </Button>
        </div>
      }
    />
  );
}
