import { useState } from "react";
import { Copy, Check } from "lucide-react";

import type { QueryResult } from "@/lib/api/types";
import { Button } from "@/components/ui/button";

type JsonResultsViewProps = {
  result: QueryResult | null;
};

export function JsonResultsView({ result }: JsonResultsViewProps) {
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-6">
        No result to display
      </div>
    );
  }

  const json = JSON.stringify(result, null, 2);

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex justify-end px-3 py-2 border-b border-border">
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => void copy()}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-muted-foreground">{json}</pre>
    </div>
  );
}
