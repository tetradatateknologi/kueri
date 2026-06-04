import { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseTagInput } from "@/lib/script-tags";
import { cn } from "@/lib/utils";

type ScriptTagsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scriptTitle: string;
  initialTags: string[];
  isPending?: boolean;
  onSubmit: (tags: string[]) => void;
};

export function ScriptTagsDialog({
  open,
  onOpenChange,
  scriptTitle,
  initialTags,
  isPending = false,
  onSubmit,
}: ScriptTagsDialogProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (open) {
      setTags(initialTags);
      setInput("");
    }
  }, [open, initialTags]);

  const addFromInput = () => {
    const next = parseTagInput(input);
    if (next.length === 0) return;
    setTags((prev) => [...new Set([...prev, ...next])]);
    setInput("");
  };

  const removeTag = (name: string) => {
    setTags((prev) => prev.filter((t) => t !== name));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pending = parseTagInput(input);
    const merged = [...new Set([...tags, ...pending])];
    onSubmit(merged);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit tags</DialogTitle>
            <DialogDescription>
              Add custom tags for <span className="font-mono text-foreground">{scriptTitle}</span>. Use names
              like fixingdata, reporting, or datauser — with or without #.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex flex-wrap gap-1.5 min-h-[28px]">
              {tags.length === 0 && (
                <p className="text-xs text-muted-foreground">No tags yet.</p>
              )}
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-mono bg-electric/10 text-electric border-electric/30"
                >
                  #{t}
                  <button
                    type="button"
                    aria-label={`Remove ${t}`}
                    onClick={() => removeTag(t)}
                    className="rounded hover:text-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div>
              <Label htmlFor="tag-input" className="text-xs text-muted-foreground">
                Add tags
              </Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  id="tag-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFromInput();
                    }
                  }}
                  placeholder="#reporting fixingdata"
                  className="font-mono text-xs"
                  autoFocus
                />
                <Button type="button" variant="outline" size="sm" onClick={addFromInput}>
                  Add
                </Button>
              </div>
              <p className={cn("text-[10px] text-muted-foreground mt-1.5")}>
                Separate multiple tags with spaces or commas.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving…" : "Save tags"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
