import { FileCode2 } from "lucide-react";

import { SqlEditor } from "@/components/kueri/SqlEditor";
import { WorkspaceEmptyState } from "@/components/kueri/WorkspaceEmptyState";

type EditorPaneProps = {
  value: string;
  onChange: (value: string) => void;
};

export function EditorPane({ value, onChange }: EditorPaneProps) {
  const isDocumentEmpty = value.trim() === "";

  return (
    <div className="relative h-full min-h-0">
      <SqlEditor value={value} onChange={onChange} />
      {isDocumentEmpty && (
        <WorkspaceEmptyState
          aria-hidden
          className="absolute inset-0 pointer-events-none bg-transparent"
          icon={FileCode2}
          title="Write a SQL query"
          hint="⌘↵ to run when ready"
        />
      )}
    </div>
  );
}
