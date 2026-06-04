import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { searchWorkspaces } from "@/lib/api/workspaces";
import type { Workspace } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const ALL_PROJECTS_VALUE = "__all__";

type ProjectFilterComboboxProps = {
  value: number | null;
  workspaces: Workspace[];
  onChange: (workspace: Workspace | null) => void;
  className?: string;
};

export function ProjectFilterCombobox({
  value,
  workspaces,
  onChange,
  className,
}: ProjectFilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [options, setOptions] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadOptions = useCallback(async (search: string) => {
    setLoading(true);
    setFetchError(false);
    try {
      const results = await searchWorkspaces(search);
      setOptions(results);
    } catch {
      setFetchError(true);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadOptions(debouncedQuery);
  }, [open, debouncedQuery, loadOptions]);

  useEffect(() => {
    if (value == null) {
      setPickedLabel(null);
      return;
    }
    const fromCache = workspaces.find((w) => w.id === value);
    if (fromCache) {
      setPickedLabel(fromCache.name);
    }
  }, [value, workspaces]);

  const displayLabel = useMemo(() => {
    if (value == null) return "All projects";
    return (
      workspaces.find((w) => w.id === value)?.name ??
      options.find((w) => w.id === value)?.name ??
      pickedLabel ??
      "Project"
    );
  }, [value, workspaces, options, pickedLabel]);

  const handleSelect = (selected: string) => {
    if (selected === ALL_PROJECTS_VALUE) {
      setPickedLabel(null);
      onChange(null);
      setOpen(false);
      setQuery("");
      return;
    }
    const id = Number(selected);
    const ws = options.find((w) => w.id === id) ?? workspaces.find((w) => w.id === id);
    if (ws) {
      setPickedLabel(ws.name);
      onChange(ws);
    }
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label="Filter by project"
          className={cn(
            "flex flex-1 min-w-0 items-center justify-between gap-1 bg-surface-1 border border-border rounded-md text-xs px-2 py-1.5 outline-none focus:border-electric/60 focus:ring-1 focus:ring-electric/30 transition-colors text-left",
            className,
          )}
        >
          <span className="truncate">{displayLabel}</span>
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground opacity-70" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search projects…"
            value={query}
            onValueChange={setQuery}
            className="h-9 text-xs"
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Searching…
              </div>
            ) : fetchError ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Could not load projects.
              </div>
            ) : (
              <>
                <CommandEmpty className="py-6 text-xs">No projects found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value={ALL_PROJECTS_VALUE}
                    onSelect={handleSelect}
                    className="text-xs"
                  >
                    <Check
                      className={cn(
                        "size-3.5 shrink-0",
                        value == null ? "opacity-100" : "opacity-0",
                      )}
                    />
                    All projects
                  </CommandItem>
                  {options.map((ws) => (
                    <CommandItem
                      key={ws.id}
                      value={String(ws.id)}
                      onSelect={handleSelect}
                      className="text-xs"
                    >
                      <Check
                        className={cn(
                          "size-3.5 shrink-0",
                          value === ws.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">{ws.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
