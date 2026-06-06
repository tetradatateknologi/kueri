import { describe, expect, it } from "vitest";

import type { ErdMetadata } from "@/lib/api/erd";
import {
  ERD_LAYOUT_STORAGE_PREFIX,
  applyAutoLayout,
  applyGridLayout,
  applySavedPositions,
  buildErdEdges,
  buildErdGraph,
  erdLayoutStorageKey,
  filterErdTables,
  getConnectedTableIds,
  loadSavedErdLayout,
  saveErdLayout,
  tableMatchesSearch,
} from "@/lib/schema-erd";

const sampleMetadata: ErdMetadata = {
  connectionId: 1,
  database: "app",
  driver: "postgres",
  schemas: ["public"],
  tables: [
    {
      id: "public.users",
      schema: "public",
      name: "users",
      columns: [
        {
          name: "id",
          dataType: "bigint",
          isNullable: false,
          isPrimaryKey: true,
          isForeignKey: false,
        },
        {
          name: "port_id",
          dataType: "bigint",
          isNullable: true,
          isPrimaryKey: false,
          isForeignKey: true,
        },
        {
          name: "email",
          dataType: "varchar",
          isNullable: false,
          isPrimaryKey: false,
          isForeignKey: false,
        },
      ],
    },
    {
      id: "public.ports",
      schema: "public",
      name: "ports",
      columns: [
        {
          name: "id",
          dataType: "bigint",
          isNullable: false,
          isPrimaryKey: true,
          isForeignKey: false,
        },
      ],
    },
  ],
  relations: [
    {
      id: "public_users_port_id_public_ports_id",
      sourceSchema: "public",
      sourceTable: "users",
      sourceColumn: "port_id",
      targetSchema: "public",
      targetTable: "ports",
      targetColumn: "id",
      constraintName: "users_port_id_fkey",
    },
  ],
};

describe("schema-erd utilities", () => {
  it("matches tables and columns by search", () => {
    expect(tableMatchesSearch(sampleMetadata.tables[0], "port")).toBe(true);
    expect(tableMatchesSearch(sampleMetadata.tables[0], "email")).toBe(true);
    expect(tableMatchesSearch(sampleMetadata.tables[0], "missing")).toBe(false);
  });

  it("filters tables by schema and visibility", () => {
    const hidden = new Set<string>();
    const visible = filterErdTables(sampleMetadata.tables, {
      search: "",
      schemaFilter: "public",
      hiddenTableIds: hidden,
    });
    expect(visible).toHaveLength(2);

    hidden.add("public.ports");
    const one = filterErdTables(sampleMetadata.tables, {
      search: "",
      schemaFilter: null,
      hiddenTableIds: hidden,
    });
    expect(one).toHaveLength(1);
    expect(one[0].name).toBe("users");
  });

  it("builds graph nodes and relationship edges", () => {
    const { nodes, edges } = buildErdGraph(sampleMetadata, sampleMetadata.tables, {
      showSchemaLabel: false,
      search: "",
    });
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe("public.users");
    expect(edges[0].target).toBe("public.ports");
  });

  it("builds edges only for visible tables", () => {
    const edges = buildErdEdges(sampleMetadata.relations, new Set(["public.users"]));
    expect(edges).toHaveLength(0);
  });

  it("applies auto and grid layouts with positions", () => {
    const { nodes, edges } = buildErdGraph(sampleMetadata, sampleMetadata.tables, {
      showSchemaLabel: false,
      search: "",
    });
    const auto = applyAutoLayout(nodes, edges);
    expect(auto[0].position.x).not.toBe(0);
    const grid = applyGridLayout(nodes);
    expect(grid[1].position.x).toBeGreaterThan(0);
  });

  it("restores saved node positions", () => {
    const { nodes } = buildErdGraph(sampleMetadata, sampleMetadata.tables, {
      showSchemaLabel: false,
      search: "",
    });
    const saved = {
      connectionId: 1,
      updatedAt: new Date().toISOString(),
      nodes: [{ tableId: "public.users", x: 120, y: 80 }],
    };
    const restored = applySavedPositions(nodes, saved);
    expect(restored[0].position).toEqual({ x: 120, y: 80 });
  });

  it("finds connected tables for highlighting", () => {
    const connected = getConnectedTableIds("public.users", sampleMetadata.relations);
    expect(connected.has("public.ports")).toBe(true);
    expect(connected.has("public.users")).toBe(true);
  });

  it("persists layout in local storage", () => {
    const key = erdLayoutStorageKey(42);
    expect(key).toBe(`${ERD_LAYOUT_STORAGE_PREFIX}42`);

    const { nodes } = buildErdGraph(sampleMetadata, sampleMetadata.tables, {
      showSchemaLabel: false,
      search: "",
    });
    nodes[0].position = { x: 10, y: 20 };
    saveErdLayout(42, nodes);

    const loaded = loadSavedErdLayout(42);
    expect(loaded?.nodes[0]).toEqual({ tableId: "public.users", x: 10, y: 20 });

    localStorage.removeItem(key);
  });
});
