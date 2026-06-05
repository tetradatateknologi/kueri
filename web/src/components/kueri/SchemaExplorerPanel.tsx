import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  Columns3,
  Eye,
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  Table2,
} from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { fetchConnectionSchema, fetchTableColumns } from "@/lib/api/schema";
import { cn } from "@/lib/utils";

type SchemaExplorerPanelProps = {
  connectionId: number | null;
  connectionLabel?: string;
};

function tableKey(schema: string, table: string) {
  return `${schema}\0${table}`;
}

type TableColumnsProps = {
  connectionId: number;
  schema: string;
  table: string;
  open: boolean;
};

function TableColumns({ connectionId, schema, table, open }: TableColumnsProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["schema-columns", connectionId, schema, table],
    queryFn: () => fetchTableColumns(connectionId, schema, table),
    enabled: open,
    staleTime: 120_000,
  });

  if (!open) return null;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 pl-8 pr-2 text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Loading columns…
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-2 pl-8 pr-2 text-[11px] text-destructive">
        {error instanceof Error ? error.message : "Failed to load columns"}
      </p>
    );
  }

  if (!data?.columns.length) {
    return <p className="py-2 pl-8 pr-2 text-[11px] text-muted-foreground">No columns</p>;
  }

  return (
    <ul className="pb-1 pl-6 pr-1 space-y-0.5" role="list">
      {data.columns.map((col) => (
        <li
          key={col.name}
          className="flex items-start gap-1.5 rounded px-2 py-1 text-[11px] font-mono text-muted-foreground hover:bg-surface-1/80"
          title={col.defaultValue ? `Default: ${col.defaultValue}` : undefined}
        >
          {col.isPrimaryKey ? (
            <KeyRound className="size-3 shrink-0 text-electric mt-0.5" aria-label="Primary key" />
          ) : (
            <Columns3 className="size-3 shrink-0 opacity-40 mt-0.5" aria-hidden />
          )}
          <span className="min-w-0 flex-1 truncate text-foreground">{col.name}</span>
          <span className="shrink-0 text-[10px] opacity-70">{col.dataType}</span>
          {col.isNullable && (
            <span className="shrink-0 text-[9px] uppercase tracking-wide opacity-50">null</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function SchemaExplorerPanel({ connectionId, connectionLabel }: SchemaExplorerPanelProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [openSchemas, setOpenSchemas] = useState<Record<string, boolean>>({});
  const [openTables, setOpenTables] = useState<Record<string, boolean>>({});

  const schemaQuery = useQuery({
    queryKey: ["connection-schema", connectionId],
    queryFn: () => fetchConnectionSchema(connectionId!),
    enabled: connectionId != null && connectionId > 0,
    staleTime: 120_000,
  });

  useEffect(() => {
    setSearch("");
    setOpenSchemas({});
    setOpenTables({});
  }, [connectionId]);

  const filtered = useMemo(() => {
    const schemas = schemaQuery.data?.schemas ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return schemas;

    return schemas
      .map((schema) => {
        const schemaMatches = schema.name.toLowerCase().includes(q);
        const tables = schema.tables.filter(
          (t) => schemaMatches || t.name.toLowerCase().includes(q),
        );
        if (tables.length === 0 && !schemaMatches) return null;
        return { ...schema, tables: schemaMatches ? schema.tables : tables };
      })
      .filter((s): s is NonNullable<typeof s> => s != null);
  }, [schemaQuery.data?.schemas, search]);

  const handleRefresh = () => {
    if (connectionId == null) return;
    void queryClient.invalidateQueries({ queryKey: ["connection-schema", connectionId] });
    void queryClient.invalidateQueries({ queryKey: ["schema-columns", connectionId] });
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r border-border bg-surface-1/20">
      <div className="h-10 shrink-0 flex items-center gap-2 border-b border-border px-3 bg-surface-1/40">
        <Table2 className="size-3.5 text-electric shrink-0" aria-hidden />
        <span className="text-xs font-semibold truncate">Schema</span>
        <span className="sr-only">Read-only database structure</span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={connectionId == null || schemaQuery.isFetching}
          className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-40"
          aria-label="Refresh schema"
          title="Refresh schema"
        >
          <RefreshCw className={cn("size-3.5", schemaQuery.isFetching && "animate-spin")} />
        </button>
      </div>

      {connectionLabel && (
        <p className="shrink-0 px-3 py-1.5 text-[10px] text-muted-foreground font-mono truncate border-b border-border/60">
          {connectionLabel}
        </p>
      )}

      <div className="shrink-0 px-2 py-2 border-b border-border/60">
        <div className="relative">
          <Search className="size-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter tables…"
            disabled={connectionId == null}
            className="w-full bg-surface-1 border border-border rounded-md text-[11px] pl-7 pr-2 py-1.5 outline-none focus:border-electric/60 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-1 py-2">
        {connectionId == null ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            <Eye className="size-5 mx-auto mb-2 opacity-40" />
            Select a connection in the sidebar to browse its schema.
          </div>
        ) : schemaQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-electric" />
            Loading schema…
          </div>
        ) : schemaQuery.isError ? (
          <p className="px-3 py-4 text-xs text-destructive">
            {schemaQuery.error instanceof Error
              ? schemaQuery.error.message
              : "Could not load schema"}
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted-foreground text-center">
            {search ? "No tables match your filter." : "No tables found."}
          </p>
        ) : (
          <div className="space-y-1">
            {filtered.map((schema) => {
              const schemaOpen = openSchemas[schema.name] ?? true;
              return (
                <Collapsible
                  key={schema.name}
                  open={schemaOpen}
                  onOpenChange={(open) =>
                    setOpenSchemas((prev) => ({ ...prev, [schema.name]: open }))
                  }
                >
                  <CollapsibleTrigger className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-foreground hover:bg-surface-1/80">
                    <ChevronRight
                      className={cn(
                        "size-3 shrink-0 transition-transform",
                        schemaOpen && "rotate-90",
                      )}
                    />
                    <span className="truncate font-mono">{schema.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      {schema.tables.length}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="space-y-0.5 pb-1">
                      {schema.tables.map((tbl) => {
                        const key = tableKey(schema.name, tbl.name);
                        const tblOpen = openTables[key] ?? false;
                        return (
                          <li key={key}>
                            <Collapsible
                              open={tblOpen}
                              onOpenChange={(open) =>
                                setOpenTables((prev) => ({ ...prev, [key]: open }))
                              }
                            >
                              <CollapsibleTrigger className="flex w-full items-center gap-1 rounded-md py-1 pl-5 pr-2 text-left text-[11px] hover:bg-surface-1/80">
                                <ChevronRight
                                  className={cn(
                                    "size-3 shrink-0 transition-transform",
                                    tblOpen && "rotate-90",
                                  )}
                                />
                                <span className="truncate font-mono text-foreground/90">
                                  {tbl.name}
                                </span>
                                {tbl.kind === "view" && (
                                  <span className="text-[9px] uppercase text-muted-foreground">
                                    view
                                  </span>
                                )}
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <TableColumns
                                  connectionId={connectionId}
                                  schema={schema.name}
                                  table={tbl.name}
                                  open={tblOpen}
                                />
                              </CollapsibleContent>
                            </Collapsible>
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      <p className="shrink-0 px-3 py-2 text-[10px] text-muted-foreground border-t border-border/60">
        Read-only · expand a table to see columns
      </p>
    </div>
  );
}
