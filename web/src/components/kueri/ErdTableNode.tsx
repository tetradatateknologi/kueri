import { Handle, Position, type NodeProps } from "@xyflow/react";
import { KeyRound, Link2 } from "lucide-react";
import { memo } from "react";

import type { ErdTableNodeData } from "@/lib/schema-erd";
import { cn } from "@/lib/utils";

function columnMatchesSearch(name: string, searchTerm: string) {
  return searchTerm !== "" && name.toLowerCase().includes(searchTerm);
}

export const ErdTableNode = memo(function ErdTableNode({
  data,
  selected,
}: NodeProps & { data: ErdTableNodeData }) {
  const { table, showSchemaLabel, schemaLabel, highlighted, searchTerm } = data;

  return (
    <div
      className={cn(
        "rounded-md border bg-surface-1 shadow-sm text-[11px] font-mono overflow-hidden",
        selected || highlighted
          ? "border-electric/70 ring-1 ring-electric/30"
          : "border-border",
      )}
      style={{ width: 240 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-electric !w-2 !h-2 !border-0" />
      <div className="px-2.5 py-2 border-b border-border bg-surface-2/80">
        {showSchemaLabel && schemaLabel && (
          <p className="text-[9px] uppercase tracking-wide text-muted-foreground truncate mb-0.5">
            {schemaLabel}
          </p>
        )}
        <p className="font-semibold text-foreground truncate">{table.name}</p>
      </div>
      <ul className="py-1">
        {table.columns.length === 0 ? (
          <li className="px-2.5 py-1 text-muted-foreground">No columns</li>
        ) : (
          table.columns.map((col) => {
            const isMatch = columnMatchesSearch(col.name, searchTerm);
            return (
              <li
                key={col.name}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-0.5",
                  col.isPrimaryKey && "bg-electric/10",
                  col.isForeignKey && !col.isPrimaryKey && "bg-primary/5",
                  isMatch && "outline outline-1 outline-electric/40 -outline-offset-1",
                )}
              >
                <span className="flex shrink-0 w-3 justify-center">
                  {col.isPrimaryKey ? (
                    <KeyRound className="size-3 text-electric" aria-label="Primary key" />
                  ) : col.isForeignKey ? (
                    <Link2 className="size-3 text-primary" aria-label="Foreign key" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground">{col.name}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">{col.dataType}</span>
                {col.isNullable && (
                  <span className="shrink-0 text-[8px] uppercase text-muted-foreground/60">null</span>
                )}
              </li>
            );
          })
        )}
      </ul>
      <Handle type="source" position={Position.Right} className="!bg-electric !w-2 !h-2 !border-0" />
    </div>
  );
});
