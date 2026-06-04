import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  downloadCsv,
  formatExportFilename,
  inferTableName,
  resultToCsv,
} from "@/lib/export-utils";
import { useWorkspaceStore } from "@/stores/workspace-store";

type ExportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sql: string;
  title: string;
};

const TOKENS = ["{{project}}", "{{env}}", "{{table}}", "{{date}}", "{{user}}"];

export function ExportModal({ open, onOpenChange, sql, title }: ExportModalProps) {
  const [filename, setFilename] = useState("{{project}}_{{env}}_{{table}}_{{date}}.csv");

  const lastResult = useWorkspaceStore((s) => s.lastResult);
  const env = useWorkspaceStore((s) => s.env);
  const selectedConnection = useWorkspaceStore((s) => s.selectedConnection);

  const project = selectedConnection?.projectName ?? "kueri";

  const preview = formatExportFilename(filename.replace(/\.csv$/i, ""), {
    project: project.toLowerCase().replace(/\s+/g, "_"),
    env,
    table: inferTableName(sql),
    user: "alex.dev",
  });

  const handleExport = () => {
    if (!lastResult) {
      toast.error("No results to export");
      return;
    }
    const name = formatExportFilename(filename.replace(/\.csv$/i, ""), {
      project: project.toLowerCase().replace(/\s+/g, "_"),
      env,
      table: inferTableName(sql),
      user: "alex.dev",
    });
    downloadCsv(name, resultToCsv(lastResult));
    toast.success(`Exported ${name}.csv`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-electric" />
            Smart Export
          </DialogTitle>
          <DialogDescription>
            Download results for <span className="font-mono text-foreground">{title}</span> as CSV.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="export-filename" className="text-xs text-muted-foreground">
              Dynamic filename format
            </Label>
            <Input
              id="export-filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="mt-1.5 font-mono text-sm"
            />
            <p className="mt-2 text-[11px] text-muted-foreground font-mono">
              Preview: <span className="text-neon">{preview}.csv</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-surface-1 border border-border rounded-md px-3 py-2">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Format</div>
              <div className="font-mono mt-0.5">CSV</div>
            </div>
            <div className="bg-surface-1 border border-border rounded-md px-3 py-2">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Rows</div>
              <div className="font-mono mt-0.5">{lastResult?.rowCount ?? 0}</div>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground font-mono flex flex-wrap gap-2">
            <span className="text-muted-foreground/70">Tokens:</span>
            {TOKENS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilename((f) => f + t)}
                className="text-electric/80 hover:text-electric transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={!lastResult} onClick={handleExport}>
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
