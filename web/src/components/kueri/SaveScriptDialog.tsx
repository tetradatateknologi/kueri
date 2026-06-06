import { useEffect, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Workspace } from "@/lib/api/types";
import { stripScriptTitleExtension, toScriptTitle } from "@/lib/script-title";

type SaveScriptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTitle: string;
  initialWorkspaceId: number | null;
  workspaces: Workspace[];
  isPending?: boolean;
  onSubmit: (values: { title: string; workspaceId: number }) => void;
};

export function SaveScriptDialog({
  open,
  onOpenChange,
  initialTitle,
  initialWorkspaceId,
  workspaces,
  isPending = false,
  onSubmit,
}: SaveScriptDialogProps) {
  const [name, setName] = useState(stripScriptTitleExtension(initialTitle));
  const [workspaceId, setWorkspaceId] = useState<string>(
    initialWorkspaceId != null ? String(initialWorkspaceId) : "",
  );

  useEffect(() => {
    if (!open) return;
    setName(stripScriptTitleExtension(initialTitle));
    setWorkspaceId(
      initialWorkspaceId != null
        ? String(initialWorkspaceId)
        : workspaces[0]
          ? String(workspaces[0].id)
          : "",
    );
  }, [open, initialTitle, initialWorkspaceId, workspaces]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = toScriptTitle(name);
    const wsId = Number(workspaceId);
    if (!title || !Number.isFinite(wsId)) return;
    onSubmit({ title, workspaceId: wsId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Save Script</DialogTitle>
            <DialogDescription>Choose a name and project for this script.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="save-script-name" className="text-xs text-muted-foreground">
                Name
              </Label>
              <Input
                id="save-script-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 font-mono"
                placeholder="my-query"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="save-script-project" className="text-xs text-muted-foreground">
                Project
              </Label>
              <Select value={workspaceId} onValueChange={setWorkspaceId}>
                <SelectTrigger id="save-script-project" className="mt-1.5">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {workspaces.map((ws) => (
                    <SelectItem key={ws.id} value={String(ws.id)}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending || !workspaceId}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
