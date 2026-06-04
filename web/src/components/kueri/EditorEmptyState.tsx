import { FileCode2, Plus } from "lucide-react";

import { WorkspaceEmptyState } from "@/components/kueri/WorkspaceEmptyState";
import { Button } from "@/components/ui/button";

type EditorEmptyStateProps = {
  onCreateScript: () => void;
};

export function EditorEmptyState({ onCreateScript }: EditorEmptyStateProps) {
  return (
    <WorkspaceEmptyState
      role="region"
      aria-label="SQL editor"
      className="bg-surface-1"
      icon={FileCode2}
      title="Open or create a script"
      hint="Click + in the tab bar or pick one from the sidebar"
      action={
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-1 gap-1.5 text-xs"
          onClick={onCreateScript}
        >
          <Plus className="size-3.5" />
          New script
        </Button>
      }
    />
  );
}
