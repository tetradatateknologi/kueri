import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
import { ApiError } from "@/lib/api/http";
import { createWorkspace } from "@/lib/api/workspaces";
import { showSuccess, showValidationError } from "@/lib/toasts";

type CreateWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateWorkspaceDialog({ open, onOpenChange }: CreateWorkspaceDialogProps) {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createWorkspace({ name: name.trim() }),
    onSuccess: async (ws) => {
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      showSuccess(`Workspace "${ws.name}" created`);
      setName("");
      onOpenChange(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to create workspace";
      showValidationError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showValidationError("Workspace name is required");
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>Create a workspace to organize database connections and scripts.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="workspace-name" className="text-xs text-muted-foreground">
              Name
            </Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
              placeholder="My project"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
