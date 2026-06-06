import "@xyflow/react/dist/style.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import {
  Expand,
  LayoutGrid,
  Loader2,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Table2,
  Wand2,
} from "lucide-react";

import { ErdTableNode } from "@/components/kueri/ErdTableNode";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

type ErdLayout = "compact" | "expanded";

type FitViewFn = (options?: { padding?: number; duration?: number }) => Promise<boolean>;

type ErdCanvasState = ReturnType<typeof useErdCanvas>;

function useErdCanvas(connectionId: number, fitViewRef: MutableRefObject<FitViewFn | null>) {
  const queryClient = useQueryClient();

  const requestFitView = useCallback(
    (options?: { padding?: number; duration?: number }) => {
      requestAnimationFrame(() => {
        void fitViewRef.current?.(options ?? { padding: 0.2, duration: 200 });
      });
    },
    [fitViewRef],
  );

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

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<Node<ErdTableNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<ErdTableNodeData>>[]) => {
      onNodesChangeInternal(
        changes.filter((change) => change.type !== "position" && change.type !== "dimensions"),
      );
    },
    [onNodesChangeInternal],
  );

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
        if (
          laidOut.every(
            (n, i) =>
              n.position.x === graph.nodes[i]?.position.x &&
              n.position.y === graph.nodes[i]?.position.y,
          )
        ) {
          laidOut = applyAutoLayout(graph.nodes, graph.edges);
        }
      }
      setNodes(laidOut);
      setEdges(graph.edges);
      setLayoutReady(true);
      requestFitView({ padding: 0.2, duration: 200 });
    },
    [connectionId, graph.edges, graph.nodes, metadata, requestFitView, setEdges, setNodes],
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
    requestFitView({ padding: 0.2, duration: 200 });
  }, [
    connectionId,
    graph.edges,
    graph.nodes,
    largeSchemaConfirmed,
    metadata,
    requestFitView,
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

  return {
    erdQuery,
    metadata,
    showSchemaLabel,
    search,
    setSearch,
    schemaFilter,
    setSchemaFilter,
    hiddenTableIds,
    visibleTables,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    layoutReady,
    needsLargeSchemaConfirm,
    setLargeSchemaConfirmed,
    tablesBySchema,
    toggleTableVisibility,
    toggleAllTables,
    onNodeClick,
    applyLayout,
    handleRefresh,
    handleSaveLayout,
    requestFitView,
  };
}

function ErdToolButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={cn(
            "p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-40",
            className,
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function ErdToolbar({
  erd,
  layout,
  onExpand,
}: {
  erd: ErdCanvasState;
  layout: ErdLayout;
  onExpand?: () => void;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="shrink-0 flex flex-wrap items-center gap-1 border-b border-border/60 px-2 py-1.5 bg-surface-1/30">
        <ErdToolButton
          label="Fit diagram to viewport"
          onClick={() => erd.requestFitView({ padding: 0.2, duration: 200 })}
        >
          <Maximize2 className="size-3.5" />
        </ErdToolButton>
        <ErdToolButton
          label="Auto layout by relationships"
          onClick={() => erd.applyLayout("auto")}
        >
          <Wand2 className="size-3.5" />
        </ErdToolButton>
        <ErdToolButton label="Grid layout" onClick={() => erd.applyLayout("grid")}>
          <LayoutGrid className="size-3.5" />
        </ErdToolButton>
        <ErdToolButton
          label="Save table positions"
          onClick={erd.handleSaveLayout}
          disabled={erd.nodes.length === 0}
        >
          <Save className="size-3.5" />
        </ErdToolButton>
        <ErdToolButton label="Reset to auto layout" onClick={() => erd.applyLayout("auto")}>
          <RotateCcw className="size-3.5" />
        </ErdToolButton>
        {layout === "compact" && onExpand && (
          <ErdToolButton label="Open fullscreen" onClick={onExpand}>
            <Expand className="size-3.5" />
          </ErdToolButton>
        )}
        <ErdToolButton
          label="Refresh ERD metadata"
          onClick={erd.handleRefresh}
          disabled={erd.erdQuery.isFetching}
          className="ml-auto"
        >
          <RefreshCw className={cn("size-3.5", erd.erdQuery.isFetching && "animate-spin")} />
        </ErdToolButton>
      </div>
    </TooltipProvider>
  );
}

function ErdFilters({ erd, className }: { erd: ErdCanvasState; className?: string }) {
  return (
    <div className={cn("shrink-0 px-2 py-2 space-y-2", className)}>
      <div className="relative">
        <Search className="size-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={erd.search}
          onChange={(e) => erd.setSearch(e.target.value)}
          placeholder="Search table, schema or column"
          className="w-full bg-surface-1 border border-border rounded-md text-[11px] pl-7 pr-2 py-1.5 outline-none focus:border-electric/60"
        />
      </div>
      {erd.showSchemaLabel && erd.metadata && (
        <Select
          value={erd.schemaFilter ?? "__all__"}
          onValueChange={(v) => erd.setSchemaFilter(v === "__all__" ? null : v)}
        >
          <SelectTrigger className="h-7 text-[11px] bg-surface-1">
            <SelectValue placeholder="Group by: Schema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All schemas</SelectItem>
            {erd.metadata.schemas.map((schema) => (
              <SelectItem key={schema} value={schema}>
                {schema}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function ErdTableList({
  erd,
  variant = "compact",
  className,
}: {
  erd: ErdCanvasState;
  variant?: "compact" | "expanded";
  className?: string;
}) {
  if (!erd.metadata || erd.metadata.tables.length === 0) return null;

  const visibleCount = erd.metadata.tables.length - erd.hiddenTableIds.size;

  return (
    <div
      className={cn(
        "overflow-y-auto border-border/60",
        variant === "compact" ? "shrink-0 max-h-28 border-b px-2 py-1.5" : "flex-1 min-h-0 px-2.5 py-2",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5">
        <div className="min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Tables
          </span>
          <p className="text-[9px] text-muted-foreground/70 tabular-nums mt-0.5">
            {visibleCount} of {erd.metadata.tables.length} visible
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-border/70 bg-surface-1/80 text-foreground hover:border-electric/40 hover:text-electric transition-colors"
            onClick={() => erd.toggleAllTables(true)}
          >
            All
          </button>
          <button
            type="button"
            className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-border/70 bg-surface-1/40 text-muted-foreground hover:border-border hover:text-foreground transition-colors"
            onClick={() => erd.toggleAllTables(false)}
          >
            None
          </button>
        </div>
      </div>
      {erd.tablesBySchema.map(([schema, tables]) => (
        <div key={schema} className="mb-3 last:mb-0">
          <div className="flex items-center gap-2 px-1 mb-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
              {schema}
            </span>
            <div className="flex-1 h-px bg-border/50" aria-hidden />
          </div>
          <ul className="space-y-0.5">
            {tables.map((table) => {
              const visible = !erd.hiddenTableIds.has(table.id);
              const inputId = `erd-vis-${table.id}`;

              return (
                <li key={table.id}>
                  <label
                    htmlFor={inputId}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-md border px-2 py-1.5 cursor-pointer transition-all",
                      visible
                        ? "border-border/50 bg-surface-1/50 hover:border-electric/30 hover:bg-surface-1"
                        : "border-transparent bg-transparent opacity-55 hover:opacity-80 hover:bg-surface-1/40",
                    )}
                  >
                    <Checkbox
                      id={inputId}
                      checked={visible}
                      onCheckedChange={(checked) =>
                        erd.toggleTableVisibility(table.id, checked === true)
                      }
                      className="h-3.5 w-3.5 rounded-[4px] border-border/80 bg-background shadow-none data-[state=checked]:border-electric/50 data-[state=checked]:bg-electric data-[state=checked]:text-primary-foreground [&_svg]:size-2.5"
                    />
                    <Table2
                      className={cn(
                        "size-3 shrink-0 transition-colors",
                        visible ? "text-electric/80" : "text-muted-foreground/50",
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate text-[11px] font-mono transition-colors",
                        visible ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {table.name}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ErdFlowCanvas({
  erd,
  fitViewRef,
  syncViewport = false,
}: {
  erd: ErdCanvasState;
  fitViewRef: MutableRefObject<FitViewFn | null>;
  syncViewport?: boolean;
}) {
  const { fitView } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fitViewRef.current = fitView;
    return () => {
      if (fitViewRef.current === fitView) {
        fitViewRef.current = null;
      }
    };
  }, [fitView, fitViewRef]);

  useEffect(() => {
    if (!syncViewport || erd.nodes.length === 0) return;

    const runFit = () => {
      requestAnimationFrame(() => {
        void fitView({ padding: 0.1, duration: 250 });
      });
    };

    runFit();
    const timers = [100, 250, 500].map((ms) => window.setTimeout(runFit, ms));
    const el = containerRef.current;
    const observer =
      el != null
        ? new ResizeObserver(() => {
            runFit();
          })
        : null;
    if (el && observer) observer.observe(el);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      observer?.disconnect();
    };
  }, [erd.nodes.length, fitView, syncViewport]);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 relative h-full w-full bg-background/50">
      {erd.erdQuery.isLoading ? (
        <div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-electric" />
          Loading ERD metadata…
        </div>
      ) : erd.erdQuery.isError ? (
        <p className="px-3 py-6 text-xs text-destructive text-center">
          Failed to load ERD metadata.
          <br />
          Check your connection and permissions, then try again.
        </p>
      ) : erd.needsLargeSchemaConfirm ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-xs text-muted-foreground">
            This database contains {erd.metadata?.tables.length} tables. Rendering all tables may be
            slow. Use filters to reduce diagram size before rendering.
          </p>
          <button
            type="button"
            onClick={() => erd.setLargeSchemaConfirmed(true)}
            className="text-xs px-3 py-1.5 rounded-md bg-electric/20 text-electric border border-electric/40 hover:bg-electric/30"
          >
            Continue anyway
          </button>
        </div>
      ) : !erd.metadata || erd.metadata.tables.length === 0 ? (
        <p className="px-3 py-6 text-xs text-muted-foreground text-center">
          No tables found for this connection.
        </p>
      ) : erd.visibleTables.length === 0 ? (
        <p className="px-3 py-6 text-xs text-muted-foreground text-center">
          No tables match your filters.
        </p>
      ) : (
        <>
          <ReactFlow
            nodes={erd.nodes}
            edges={erd.edges}
            onNodesChange={erd.onNodesChange}
            onEdgesChange={erd.onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={erd.onNodeClick}
            nodesDraggable={false}
            selectNodesOnDrag={false}
            onInit={(instance) => {
              void instance.fitView({ padding: syncViewport ? 0.1 : 0.2, duration: 0 });
              requestAnimationFrame(() => {
                void instance.fitView({ padding: syncViewport ? 0.1 : 0.2, duration: 200 });
              });
            }}
            minZoom={0.05}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="!absolute inset-0 !h-full !w-full bg-background"
          >
            <Background gap={16} size={1} color="oklch(0.28 0.012 250)" />
          </ReactFlow>
          {erd.metadata.relations.length === 0 && erd.layoutReady && (
            <p className="absolute bottom-2 left-2 right-2 text-[10px] text-muted-foreground text-center pointer-events-none bg-surface-1/80 rounded px-2 py-1 border border-border/60">
              No foreign key relationships found. Tables are shown without relationship lines.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ErdPanelLayout({
  erd,
  layout,
  onExpand,
  fitViewRef,
}: {
  erd: ErdCanvasState;
  layout: ErdLayout;
  onExpand?: () => void;
  fitViewRef: MutableRefObject<FitViewFn | null>;
}) {
  const [filtersOpen, setFiltersOpen] = useState(layout === "expanded");
  const syncViewport = layout === "expanded";

  if (layout === "compact") {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <ErdToolbar erd={erd} layout="compact" onExpand={onExpand} />
        <ErdFilters erd={erd} className="border-b border-border/60" />
        <ErdTableList erd={erd} />
        <ErdFlowCanvas erd={erd} fitViewRef={fitViewRef} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 min-w-0 h-full flex-col overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 border-b border-border px-3 py-2 bg-surface-1/40">
        <button
          type="button"
          onClick={() => setFiltersOpen((open) => !open)}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-1"
          title={filtersOpen ? "Hide filters" : "Show filters"}
          aria-label={filtersOpen ? "Hide filters" : "Show filters"}
          aria-pressed={filtersOpen}
        >
          {filtersOpen ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )}
        </button>
        <span className="text-xs text-muted-foreground">Filters & tables</span>
      </div>
      <div className="flex flex-1 min-h-0 min-w-0 h-full overflow-hidden">
        {filtersOpen && (
          <aside className="shrink-0 w-56 h-full min-h-0 flex flex-col overflow-hidden border-r border-border/60 bg-surface-1/20">
            <ErdFilters erd={erd} className="shrink-0 border-b border-border/60" />
            <ErdTableList erd={erd} variant="expanded" />
          </aside>
        )}
        <div className="flex flex-1 min-h-0 min-w-0 h-full flex-col overflow-hidden">
          <ErdToolbar erd={erd} layout="expanded" />
          <ErdFlowCanvas erd={erd} fitViewRef={fitViewRef} syncViewport={syncViewport} />
        </div>
      </div>
    </div>
  );
}

function ErdPanelInner({
  connectionId,
  connectionLabel,
}: {
  connectionId: number;
  connectionLabel?: string;
}) {
  const fitViewRef = useRef<FitViewFn | null>(null);
  const erd = useErdCanvas(connectionId, fitViewRef);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenFlowReady, setFullscreenFlowReady] = useState(false);

  useEffect(() => {
    setFullscreenOpen(false);
    setFullscreenFlowReady(false);
  }, [connectionId]);

  useEffect(() => {
    if (!fullscreenOpen) {
      setFullscreenFlowReady(false);
      return;
    }
    const timer = window.setTimeout(() => setFullscreenFlowReady(true), 50);
    return () => window.clearTimeout(timer);
  }, [fullscreenOpen]);

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        {connectionLabel && !fullscreenOpen && (
          <p className="shrink-0 px-3 py-1.5 text-[10px] text-muted-foreground font-mono truncate border-b border-border/60">
            {connectionLabel}
          </p>
        )}
        {fullscreenOpen ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-xs text-muted-foreground">ERD is open in fullscreen</p>
            <button
              type="button"
              onClick={() => setFullscreenOpen(true)}
              className="text-xs px-3 py-1.5 rounded-md bg-electric/20 text-electric border border-electric/40 hover:bg-electric/30"
            >
              Focus fullscreen
            </button>
          </div>
        ) : (
          <ErdPanelLayout
            erd={erd}
            layout="compact"
            fitViewRef={fitViewRef}
            onExpand={() => setFullscreenOpen(true)}
          />
        )}
      </div>

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="fixed inset-0 left-0 top-0 z-50 flex h-[100dvh] w-[100dvw] max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 shadow-none duration-0 data-[state=open]:animate-none data-[state=closed]:animate-none">
          <DialogHeader className="shrink-0 space-y-0 border-b border-border px-4 py-3 pr-12 text-left">
            <DialogTitle className="text-sm font-semibold">Entity Relationship Diagram</DialogTitle>
            {connectionLabel && (
              <DialogDescription className="text-[11px] font-mono truncate">
                {connectionLabel}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="flex flex-1 min-h-0 min-w-0 h-full overflow-hidden">
            {fullscreenFlowReady ? (
              <ErdPanelLayout erd={erd} layout="expanded" fitViewRef={fitViewRef} />
            ) : (
              <div className="flex flex-1 items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-electric" />
                Preparing diagram…
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
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
    <ReactFlowProvider>
      <ErdPanelInner connectionId={connectionId} connectionLabel={connectionLabel} />
    </ReactFlowProvider>
  );
}
