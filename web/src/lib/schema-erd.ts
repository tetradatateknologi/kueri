import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

import type { ErdMetadata, ErdRelation, ErdTable } from "@/lib/api/erd";

export const ERD_NODE_WIDTH = 240;
export const ERD_ROW_HEIGHT = 22;
export const ERD_HEADER_HEIGHT = 36;
export const ERD_LARGE_SCHEMA_THRESHOLD = 100;

export const ERD_LAYOUT_STORAGE_PREFIX = "kueri:erd-layout:";

export type ErdTableNodeData = {
  table: ErdTable;
  schemaLabel?: string;
  showSchemaLabel: boolean;
  highlighted: boolean;
  searchTerm: string;
};

export type SavedErdLayout = {
  connectionId: number;
  updatedAt: string;
  nodes: {
    tableId: string;
    x: number;
    y: number;
  }[];
};

export function erdLayoutStorageKey(connectionId: number) {
  return `${ERD_LAYOUT_STORAGE_PREFIX}${connectionId}`;
}

export function loadSavedErdLayout(connectionId: number): SavedErdLayout | null {
  try {
    const raw = localStorage.getItem(erdLayoutStorageKey(connectionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedErdLayout;
    if (parsed.connectionId !== connectionId || !Array.isArray(parsed.nodes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveErdLayout(connectionId: number, nodes: Node<ErdTableNodeData>[]) {
  const layout: SavedErdLayout = {
    connectionId,
    updatedAt: new Date().toISOString(),
    nodes: nodes.map((n) => ({
      tableId: n.id,
      x: n.position.x,
      y: n.position.y,
    })),
  };
  localStorage.setItem(erdLayoutStorageKey(connectionId), JSON.stringify(layout));
}

export function estimateTableNodeHeight(table: ErdTable) {
  return ERD_HEADER_HEIGHT + Math.max(table.columns.length, 1) * ERD_ROW_HEIGHT + 8;
}

export function tableMatchesSearch(table: ErdTable, search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  if (table.name.toLowerCase().includes(q)) return true;
  if (table.schema.toLowerCase().includes(q)) return true;
  return table.columns.some((col) => col.name.toLowerCase().includes(q));
}

export function filterErdTables(
  tables: ErdTable[],
  options: {
    search: string;
    schemaFilter: string | null;
    hiddenTableIds: Set<string>;
  },
) {
  return tables.filter((table) => {
    if (options.hiddenTableIds.has(table.id)) return false;
    if (options.schemaFilter && table.schema !== options.schemaFilter) return false;
    return tableMatchesSearch(table, options.search);
  });
}

export function buildErdGraph(
  metadata: ErdMetadata,
  visibleTables: ErdTable[],
  options: {
    showSchemaLabel: boolean;
    search: string;
    highlightedTableIds?: Set<string>;
  },
): { nodes: Node<ErdTableNodeData>[]; edges: Edge[] } {
  const visibleIds = new Set(visibleTables.map((t) => t.id));

  const nodes: Node<ErdTableNodeData>[] = visibleTables.map((table) => ({
    id: table.id,
    type: "erdTable",
    position: { x: 0, y: 0 },
    draggable: false,
    data: {
      table,
      showSchemaLabel: options.showSchemaLabel,
      schemaLabel: table.schema,
      highlighted: options.highlightedTableIds?.has(table.id) ?? false,
      searchTerm: options.search.trim().toLowerCase(),
    },
  }));

  const edges = buildErdEdges(metadata.relations, visibleIds);

  return { nodes, edges };
}

export function buildErdEdges(relations: ErdRelation[], visibleTableIds: Set<string>): Edge[] {
  return relations
    .filter((rel) => {
      const sourceId = `${rel.sourceSchema}.${rel.sourceTable}`;
      const targetId = `${rel.targetSchema}.${rel.targetTable}`;
      return visibleTableIds.has(sourceId) && visibleTableIds.has(targetId);
    })
    .map((rel) => ({
      id: rel.id,
      source: `${rel.sourceSchema}.${rel.sourceTable}`,
      target: `${rel.targetSchema}.${rel.targetTable}`,
      type: "smoothstep",
      label: "1 — *",
      animated: false,
      style: { stroke: "oklch(0.55 0.12 240)", strokeWidth: 1.5 },
      labelStyle: { fill: "oklch(0.62 0.015 250)", fontSize: 10 },
      labelBgStyle: { fill: "oklch(0.21 0.013 250)", fillOpacity: 0.9 },
      data: { relation: rel },
    }));
}

export function applyAutoLayout(
  nodes: Node<ErdTableNodeData>[],
  edges: Edge[],
): Node<ErdTableNodeData>[] {
  if (nodes.length === 0) return nodes;

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 48, ranksep: 72, marginx: 24, marginy: 24 });

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: ERD_NODE_WIDTH,
      height: estimateTableNodeHeight(node.data.table),
    });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const layoutNode = graph.node(node.id);
    const height = estimateTableNodeHeight(node.data.table);
    return {
      ...node,
      position: {
        x: layoutNode.x - ERD_NODE_WIDTH / 2,
        y: layoutNode.y - height / 2,
      },
    };
  });
}

export function applyGridLayout(nodes: Node<ErdTableNodeData>[]): Node<ErdTableNodeData>[] {
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const xGap = ERD_NODE_WIDTH + 48;
  const yGap = 180;

  return nodes.map((node, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      ...node,
      position: { x: col * xGap, y: row * yGap },
    };
  });
}

export function applySavedPositions(
  nodes: Node<ErdTableNodeData>[],
  saved: SavedErdLayout | null,
): Node<ErdTableNodeData>[] {
  if (!saved) return nodes;
  const byId = new Map(saved.nodes.map((n) => [n.tableId, n]));
  return nodes.map((node) => {
    const pos = byId.get(node.id);
    if (!pos) return node;
    return { ...node, position: { x: pos.x, y: pos.y } };
  });
}

export function getConnectedTableIds(
  tableId: string,
  relations: ErdRelation[],
): Set<string> {
  const connected = new Set<string>([tableId]);
  for (const rel of relations) {
    const sourceId = `${rel.sourceSchema}.${rel.sourceTable}`;
    const targetId = `${rel.targetSchema}.${rel.targetTable}`;
    if (sourceId === tableId) connected.add(targetId);
    if (targetId === tableId) connected.add(sourceId);
  }
  return connected;
}
