import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
} from "@xyflow/react";
import {
  LayoutGrid,
  Loader2,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Wand2,
} from "lucide-react";

import { ErdTableNode } from "@/components/kueri/ErdTableNode";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchConnectionErd } from "@/lib/api/erd";
import {
  ERD_LARGE_SCHEMA_THRESHOLD,
  applyAutoLayout,
  applyGridLayout,
  applySavedPositions,
  buildErdGraph,
  filterErdTables,
  getConnectedTableIds,
  loadSavedErdLayout,
  saveErdLayout,
  type ErdTableNodeData,
} from "@/lib/schema-erd";
import { cn } from "@/lib/utils";

const nodeTypes = { erdTable: ErdTableNode };

type SchemaErdPanelProps = {
  connectionId: number | null;
  connectionLabel?: string;
};

function ErdCanvas({ connectionId }: { connectionId: number }) {
  const queryClient = useQueryClient();
  const { fitView } = useReactFlow();

  const [search, setSearch] = useState("");
  const [schemaFilter, setSchemaFilter] = useState<string | null>(null);
  const [hiddenTableIds, setHiddenTableIds] = useState<Set<string>>(() => new Set());
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [largeSchemaConfirmed, setLargeSchemaConfirmed] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);

  const erdQuery = useQuery({
    queryKey: ["connection-erd", connectionId],
    queryFn: () => fetchConnectionErd(connectionId),
    staleTime: 120_000,
  });

  const metadata = erdQuery.data;
  const showSchemaLabel = (metadata?.schemas.length ?? 0) > 1;

  const visibleTables = useMemo(() => {
    if (!metadata) return [];
    return filterErdTables(metadata.tables, {
      search,
      schemaFilter,
      hiddenTableIds,
    });
  }, [metadata, search, schemaFilter, hiddenTableIds]);

  const highlightedTableIds = useMemo(() => {
    if (!metadata || !selectedTableId) return new Set<string>();
    return getConnectedTableIds(selectedTableId, metadata.relations);
  }, [metadata, selectedTableId]);

  const graph = useMemo(() => {
    if (!metadata) return { nodes: [], edges: [] };
    return buildErdGraph(metadata, visibleTables, {
      showSchemaLabel,
      search,
      highlightedTableIds,
    });
  }, [metadata, visibleTables, showSchemaLabel, search, highlightedTableIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<ErdTableNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  const applyLayout = useCallback(
    (mode: "auto" | "grid" | "saved") => {
      if (!metadata) return;
      let laidOut = graph.nodes;
      if (mode === "auto") {
        laidOut = applyAutoLayout(graph.nodes, graph.edges);
      } else if (mode === "grid") {
        laidOut = applyGridLayout(graph.nodes);
      } else {
        laidOut = applySavedPositions(graph.nodes, loadSavedErdLayout(connectionId));
        if (laidOut.every((n, i) => n.position.x === graph.nodes[i]?.position.x && n.position.y === graph.nodes[i]?.position.y)) {
          laidOut = applyAutoLayout(graph.nodes, graph.edges);
        }
      }
      setNodes(laidOut);
      setEdges(graph.edges);
      setLayoutReady(true);
      requestAnimationFrame(() => {
        void fitView({ padding: 0.2, duration: 200 });
      });
    },
    [connectionId, fitView, graph.edges, graph.nodes, metadata, setEdges, setNodes],
  );

  useEffect(() => {
    setSearch("");
    setSchemaFilter(null);
    setHiddenTableIds(new Set());
    setSelectedTableId(null);
    setLargeSchemaConfirmed(false);
    setLayoutReady(false);
  }, [connectionId]);

  useEffect(() => {
    if (!metadata || graph.nodes.length === 0) {
      setNodes([]);
      setEdges([]);
      setLayoutReady(false);
      return;
    }

    const isLarge = metadata.tables.length >= ERD_LARGE_SCHEMA_THRESHOLD;
    if (isLarge && !largeSchemaConfirmed) {
      setNodes([]);
      setEdges([]);
      setLayoutReady(false);
      return;
    }

    const saved = loadSavedErdLayout(connectionId);
    const laidOut = saved
      ? applySavedPositions(graph.nodes, saved)
      : metadata.relations.length > 0
        ? applyAutoLayout(graph.nodes, graph.edges)
        : applyGridLayout(graph.nodes);

    setNodes(laidOut);
    setEdges(graph.edges);
    setLayoutReady(true);
    requestAnimationFrame(() => {
      void fitView({ padding: 0.2, duration: 200 });
    });
  }, [
    connectionId,
    fitView,
    graph.edges,
    graph.nodes,
    largeSchemaConfirmed,
    metadata,
    setEdges,
    setNodes,
  ]);

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["connection-erd", connectionId] });
  };

  const handleSaveLayout = () => {
    saveErdLayout(connectionId, nodes);
  };

  const toggleTableVisibility = (tableId: string, visible: boolean) => {
    setHiddenTableIds((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(tableId);
      else next.add(tableId);
      return next;
    });
  };

  const toggleAllTables = (visible: boolean) => {
    if (!metadata) return;
    if (visible) {
      setHiddenTableIds(new Set());
    } else {
      setHiddenTableIds(new Set(metadata.tables.map((t) => t.id)));
    }
  };

  const tablesBySchema = useMemo(() => {
    if (!metadata) return [];
    const grouped = new Map<string, typeof metadata.tables>();
    for (const table of metadata.tables) {
      const list = grouped.get(table.schema) ?? [];
      list.push(table);
      grouped.set(table.schema, list);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [metadata]);

  const onNodeClick = useCallback((_: unknown, node: Node<ErdTableNodeData>) => {
    setSelectedTableId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const needsLargeSchemaConfirm =
    metadata != null &&
    metadata.tables.length >= ERD_LARGE_SCHEMA_THRESHOLD &&
    !largeSchemaConfirmed;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="shrink-0 flex flex-wrap items-center gap-1 border-b border-border/60 px-2 py-1.5 bg-surface-1/30">
        <button
          type="button"
          onClick={() => void fitView({ padding: 0.2, duration: 200 })}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-1"
          title="Fit view"
          aria-label="Fit view"
        >
          <Maximize2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyLayout("auto")}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-1"
          title="Auto layout"
          aria-label="Auto layout"
        >
          <Wand2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyLayout("grid")}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-1"
          title="Grid layout"
          aria-label="Grid layout"
        >
          <LayoutGrid className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={handleSaveLayout}
          disabled={nodes.length === 0}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-40"
          title="Save layout"
          aria-label="Save layout"
        >
          <Save className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyLayout("auto")}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-1"
          title="Reset layout"
          aria-label="Reset layout"
        >
          <RotateCcw className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={erdQuery.isFetching}
          className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-40"
          title="Refresh ERD"
          aria-label="Refresh ERD"
        >
          <RefreshCw className={cn("size-3.5", erdQuery.isFetching && "animate-spin")} />
        </button>
      </div>

      <div className="shrink-0 px-2 py-2 space-y-2 border-b border-border/60">
        <div className="relative">
          <Search className="size-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search table, schema or column"
            className="w-full bg-surface-1 border border-border rounded-md text-[11px] pl-7 pr-2 py-1.5 outline-none focus:border-electric/60"
          />
        </div>
        {showSchemaLabel && metadata && (
          <Select
            value={schemaFilter ?? "__all__"}
            onValueChange={(v) => setSchemaFilter(v === "__all__" ? null : v)}
          >
            <SelectTrigger className="h-7 text-[11px] bg-surface-1">
              <SelectValue placeholder="Group by: Schema" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All schemas</SelectItem>
              {metadata.schemas.map((schema) => (
                <SelectItem key={schema} value={schema}>
                  {schema}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {metadata && metadata.tables.length > 0 && (
        <div className="shrink-0 max-h-28 overflow-y-auto border-b border-border/60 px-2 py-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground">Tables</span>
            <div className="flex gap-2 text-[10px]">
              <button
                type="button"
                className="text-electric hover:underline"
                onClick={() => toggleAllTables(true)}
              >
                All
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:underline"
                onClick={() => toggleAllTables(false)}
              >
                None
              </button>
            </div>
          </div>
          {tablesBySchema.map(([schema, tables]) => (
            <div key={schema} className="mb-1">
              <p className="text-[10px] font-mono text-muted-foreground px-1">{schema}</p>
              <ul className="space-y-0.5">
                {tables.map((table) => (
                  <li key={table.id} className="flex items-center gap-2 px-1">
                    <Checkbox
                      id={`erd-vis-${table.id}`}
                      checked={!hiddenTableIds.has(table.id)}
                      onCheckedChange={(checked) =>
                        toggleTableVisibility(table.id, checked === true)
                      }
                    />
                    <label
                      htmlFor={`erd-vis-${table.id}`}
                      className="text-[10px] font-mono truncate cursor-pointer"
                    >
                      {table.name}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 relative bg-background/50">
        {erdQuery.isLoading ? (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-electric" />
            Loading ERD metadata…
          </div>
        ) : erdQuery.isError ? (
          <p className="px-3 py-6 text-xs text-destructive text-center">
            Failed to load ERD metadata.
            <br />
            Check your connection and permissions, then try again.
          </p>
        ) : needsLargeSchemaConfirm ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-xs text-muted-foreground">
              This database contains {metadata?.tables.length} tables. Rendering all tables may be
              slow. Use filters to reduce diagram size before rendering.
            </p>
            <button
              type="button"
              onClick={() => setLargeSchemaConfirmed(true)}
              className="text-xs px-3 py-1.5 rounded-md bg-electric/20 text-electric border border-electric/40 hover:bg-electric/30"
            >
              Continue anyway
            </button>
          </div>
        ) : !metadata || metadata.tables.length === 0 ? (
          <p className="px-3 py-6 text-xs text-muted-foreground text-center">
            No tables found for this connection.
          </p>
        ) : visibleTables.length === 0 ? (
          <p className="px-3 py-6 text-xs text-muted-foreground text-center">
            No tables match your filters.
          </p>
        ) : (
          <>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              onNodeClick={onNodeClick}
              fitView
              minZoom={0.1}
              maxZoom={2}
              proOptions={{ hideAttribution: true }}
              className="bg-background"
            >
              <Background gap={16} size={1} color="oklch(0.28 0.012 250)" />
              <Controls showInteractive={false} className="!bg-surface-1 !border-border" />
              <MiniMap
                nodeColor="oklch(0.35 0.1 240)"
                maskColor="oklch(0.15 0.012 250 / 0.7)"
                className="!bg-surface-1 !border-border"
              />
            </ReactFlow>
            {metadata.relations.length === 0 && layoutReady && (
              <p className="absolute bottom-2 left-2 right-2 text-[10px] text-muted-foreground text-center pointer-events-none bg-surface-1/80 rounded px-2 py-1 border border-border/60">
                No foreign key relationships found. Tables are shown without relationship lines.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function SchemaErdPanel({ connectionId, connectionLabel }: SchemaErdPanelProps) {
  if (connectionId == null) {
    return (
      <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted-foreground">
        Select a connection in the sidebar to view its ERD.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      {connectionLabel && (
        <p className="shrink-0 px-3 py-1.5 text-[10px] text-muted-foreground font-mono truncate border-b border-border/60">
          {connectionLabel}
        </p>
      )}
      <ReactFlowProvider>
        <ErdCanvas connectionId={connectionId} />
      </ReactFlowProvider>
    </div>
  );
}
