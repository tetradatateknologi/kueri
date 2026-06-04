import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type ScriptFavoriteButtonProps = {
  isFavorite: boolean;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
};

export function ScriptFavoriteButton({
  isFavorite,
  disabled,
  onToggle,
  className,
}: ScriptFavoriteButtonProps) {
  return (
    <button
      type="button"
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "shrink-0 p-1 rounded-md transition-colors",
        isFavorite
          ? "text-amber-400 hover:text-amber-300"
          : "text-muted-foreground hover:text-amber-400 opacity-0 group-hover:opacity-100 focus:opacity-100",
        isFavorite && "opacity-100",
        className,
      )}
    >
      <Star className={cn("size-3.5", isFavorite && "fill-current")} />
    </button>
  );
}
