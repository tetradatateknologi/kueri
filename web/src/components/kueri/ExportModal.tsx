import { useEffect, useState } from "react";
import { X, Sparkles } from "lucide-react";

export function ExportModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [filename, setFilename] = useState("{{project}}_{{env}}_{{table}}_{{date}}.csv");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const preview = filename
    .replace("{{project}}", "ecommerce")
    .replace("{{env}}", "prod")
    .replace("{{table}}", "orders")
    .replace("{{date}}", new Date().toISOString().slice(0, 10));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl glow-electric animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-electric" />
            <h2 className="text-sm font-medium">Smart Export</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">
              Dynamic Filename Format
            </label>
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full bg-surface-1 border border-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-electric/60 focus:ring-1 focus:ring-electric/30 transition-colors"
            />
            <div className="mt-2 text-[11px] text-muted-foreground font-mono">
              Preview: <span className="text-neon">{preview}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-surface-1 border border-border rounded-md px-3 py-2">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Format</div>
              <div className="font-mono mt-0.5">CSV</div>
            </div>
            <div className="bg-surface-1 border border-border rounded-md px-3 py-2">
              <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Rows</div>
              <div className="font-mono mt-0.5">8</div>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground font-mono space-x-2">
            <span className="text-muted-foreground/70">Tokens:</span>
            {["{{project}}", "{{env}}", "{{table}}", "{{date}}", "{{user}}"].map((t) => (
              <button
                key={t}
                onClick={() => setFilename((f) => f + t)}
                className="text-electric/80 hover:text-electric transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-surface-1 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-md bg-electric text-primary-foreground font-medium hover:brightness-110 transition-all glow-electric"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
