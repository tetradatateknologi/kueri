import type { KeyboardShortcutGroup } from "@/lib/keyboard-shortcuts";
import { KEYBOARD_SHORTCUT_GROUPS } from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";

type KeyboardShortcutsGuideProps = {
  groups?: KeyboardShortcutGroup[];
  className?: string;
};

export function KeyboardShortcutsGuide({
  groups = KEYBOARD_SHORTCUT_GROUPS,
  className,
}: KeyboardShortcutsGuideProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {groups.map((group) => (
        <section key={group.id} id={`shortcuts-${group.id}`}>
          <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
          {group.description && (
            <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
          )}
          <dl className="mt-3 grid gap-2">
            {group.items.map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-4 rounded-md border border-border/60 bg-surface-1/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <dt className="text-sm text-foreground">{row.label}</dt>
                  {row.description && (
                    <dd className="text-[11px] text-muted-foreground mt-0.5">{row.description}</dd>
                  )}
                </div>
                <kbd className="font-mono text-xs shrink-0 rounded border border-border bg-background px-2 py-1 text-muted-foreground">
                  {row.keys}
                </kbd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
