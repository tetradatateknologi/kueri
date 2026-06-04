import { useMemo } from "react";
import { cn } from "@/lib/utils";

const KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "JOIN", "LEFT", "RIGHT", "INNER", "OUTER", "ON", "GROUP", "BY", "ORDER",
  "LIMIT", "AS", "AND", "OR", "NOT", "IN", "IS", "NULL", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
  "DELETE", "WITH", "HAVING", "DESC", "ASC", "CASE", "WHEN", "THEN", "ELSE", "END", "DISTINCT",
]);

function highlight(line: string) {
  const parts = line.split(/(\s+|,|\(|\)|;|'[^']*')/g).filter(Boolean);
  return parts.map((tok, i) => {
    if (/^'[^']*'$/.test(tok)) return <span key={i} className="text-syntax-string">{tok}</span>;
    if (/^--/.test(tok)) return <span key={i} className="text-syntax-comment">{tok}</span>;
    if (/^\d+(\.\d+)?$/.test(tok)) return <span key={i} className="text-syntax-number">{tok}</span>;
    if (KEYWORDS.has(tok.toUpperCase()))
      return (
        <span key={i} className="text-syntax-keyword font-medium">
          {tok}
        </span>
      );
    if (/^[a-zA-Z_]+$/.test(tok) && parts[i + 1] === "(")
      return (
        <span key={i} className="text-syntax-function">
          {tok}
        </span>
      );
    return <span key={i}>{tok}</span>;
  });
}

type SqlEditorProps = {
  value: string;
  onChange?: (value: string) => void;
};

export function SqlEditor({ value, onChange }: SqlEditorProps) {
  const lines = useMemo(() => value.split("\n"), [value]);
  const editable = Boolean(onChange);

  if (editable) {
    return (
      <div className="h-full overflow-auto bg-surface-1 font-mono text-[13px] leading-6">
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          spellCheck={false}
          className={cn(
            "w-full h-full min-h-[200px] resize-none bg-transparent py-3 px-4",
            "text-foreground outline-none border-0 focus:ring-0",
            "placeholder:text-muted-foreground",
          )}
          placeholder="-- Write SQL here"
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-surface-1 font-mono text-[13px] leading-6">
      <div className="flex min-h-full">
        <div className="select-none text-right pr-3 pl-4 py-3 text-muted-foreground/60 border-r border-border bg-background/40">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="py-3 px-4 flex-1 whitespace-pre-wrap">
          {lines.map((line, i) => (
            <div key={i} className="min-h-6">
              {line.length ? highlight(line) : "\u00A0"}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
