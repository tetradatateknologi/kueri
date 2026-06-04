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
import { stripScriptTitleExtension, toScriptTitle } from "@/lib/script-title";
import { cn } from "@/lib/utils";

export type EditScriptFormValues = {
  title: string;
  tags: string[];
};

type EditScriptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle: string;
  initialTags: string[];
  isPending?: boolean;
  onSubmit: (values: EditScriptFormValues) => void;
};

export function EditScriptDialog({
  open,
  onOpenChange,
  initialTitle,
  initialTags,
  isPending = false,
  onSubmit,
}: EditScriptDialogProps) {
  const [name, setName] = useState(() => stripScriptTitleExtension(initialTitle));
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState("");

  useEffect(() => {
    if (open) {
      setName(stripScriptTitleExtension(initialTitle));
      setTags(initialTags);
      setInput("");
    }
  }, [open, initialTitle, initialTags]);

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
    const mergedTags = [...new Set([...tags, ...pending])];
    onSubmit({ title: toScriptTitle(name), tags: mergedTags });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit script</DialogTitle>
            <DialogDescription>
              Update the script title and tags shown in the library and editor tabs.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="script-name" className="text-xs text-muted-foreground">
                Script name
              </Label>
              <div className="flex mt-1.5">
                <Input
                  id="script-name"
                  value={name}
                  onChange={(e) => setName(stripScriptTitleExtension(e.target.value))}
                  className="rounded-r-none border-r-0 font-mono text-xs focus-visible:z-10"
                  placeholder="query-1"
                  autoFocus
                />
                <span
                  className="inline-flex h-9 shrink-0 items-center rounded-r-md border border-input bg-muted/50 px-3 font-mono text-xs text-muted-foreground"
                  aria-hidden
                >
                  .sql
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Tags</Label>
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
