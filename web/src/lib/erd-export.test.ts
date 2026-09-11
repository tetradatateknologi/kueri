import { describe, expect, it, vi } from "vitest";
import type { Node } from "@xyflow/react";

import type { ErdTableNodeData } from "@/lib/schema-erd";
import {
  assertNonEmptyDataUrl,
  buildErdCaptureOptions,
  computeErdExportTiles,
  DEFAULT_ERD_EXPORT_TILE_OPTIONS,
  enrichErdNodesForBounds,
  ERD_EXPORT_MIN_DATA_URL_LENGTH,
  ERD_EXPORT_PAGE_HEIGHT_PX,
  ERD_EXPORT_PAGE_WIDTH_PX,
  ERD_EXPORT_PADDING_PX,
  ERD_EXPORT_ZOOM,
  estimateExportPageCount,
  resolveErdNodesBounds,
  shouldIncludeErdExportNode,
} from "./erd-export";

const sampleTable = {
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
  ],
};

function makeNode(overrides: Partial<Node<ErdTableNodeData>> = {}): Node<ErdTableNodeData> {
  return {
    id: "public.users",
    type: "erdTable",
    position: { x: 0, y: 0 },
    data: {
      table: sampleTable,
      showSchemaLabel: false,
      highlighted: false,
      searchTerm: "",
    },
    ...overrides,
  };
}

describe("resolveErdNodesBounds", () => {
  it("returns non-zero height for nodes without explicit dimensions", () => {
    const bounds = resolveErdNodesBounds([
      makeNode({ position: { x: 0, y: 0 } }),
      makeNode({ id: "public.posts", position: { x: 300, y: 0 } }),
    ]);
    expect(bounds.height).toBeGreaterThan(0);
    expect(bounds.width).toBeGreaterThan(0);
  });

  it("uses explicit node dimensions when provided", () => {
    const bounds = resolveErdNodesBounds([
      makeNode({ width: 240, height: 120, position: { x: 10, y: 20 } }),
    ]);
    expect(bounds).toEqual({ x: 10, y: 20, width: 240, height: 120 });
  });
});

describe("enrichErdNodesForBounds", () => {
  it("adds width and height from table metadata", () => {
    const [node] = enrichErdNodesForBounds([makeNode()]);
    expect(node.width).toBe(240);
    expect(node.height).toBeGreaterThan(0);
  });
});

describe("buildErdCaptureOptions", () => {
  it("returns export dimensions and transform style", () => {
    const options = buildErdCaptureOptions({ x: 0, y: 0, width: 400, height: 300 }, "#ffffff");
    expect(options.width).toBe(ERD_EXPORT_PAGE_WIDTH_PX);
    expect(options.height).toBe(ERD_EXPORT_PAGE_HEIGHT_PX);
    expect(options.backgroundColor).toBe("#ffffff");
    expect(options.style.width).toBe(`${ERD_EXPORT_PAGE_WIDTH_PX}px`);
    expect(options.style.height).toBe(`${ERD_EXPORT_PAGE_HEIGHT_PX}px`);
    expect(options.style.transform).toMatch(/^translate\(.+\) scale\(.+\)$/);
  });
});

describe("assertNonEmptyDataUrl", () => {
  it("throws for short data URLs", () => {
    expect(() => assertNonEmptyDataUrl("data:image/png;base64,abc", 0)).toThrow(/empty image/i);
  });

  it("accepts sufficiently large data URLs", () => {
    const dataUrl = `data:image/png;base64,${"a".repeat(ERD_EXPORT_MIN_DATA_URL_LENGTH)}`;
    expect(() => assertNonEmptyDataUrl(dataUrl, 0)).not.toThrow();
  });
});

describe("shouldIncludeErdExportNode", () => {
  it("excludes react-flow controls and minimap", () => {
    const minimap = document.createElement("div");
    minimap.className = "react-flow__minimap";
    const controls = document.createElement("div");
    controls.className = "react-flow__controls";
    const pane = document.createElement("div");
    pane.className = "react-flow__pane";

    expect(shouldIncludeErdExportNode(minimap)).toBe(false);
    expect(shouldIncludeErdExportNode(controls)).toBe(false);
    expect(shouldIncludeErdExportNode(pane)).toBe(true);
  });
});

describe("computeErdExportTiles", () => {
  it("returns a single tile for small bounds", () => {
    const tiles = computeErdExportTiles({ x: 0, y: 0, width: 400, height: 300 });
    expect(tiles).toHaveLength(1);
    expect(tiles[0].width).toBeGreaterThan(400);
    expect(tiles[0].height).toBeGreaterThan(300);
  });

  it("creates multiple tiles for large bounds", () => {
    const innerWidth = (ERD_EXPORT_PAGE_WIDTH_PX - ERD_EXPORT_PADDING_PX * 2) / ERD_EXPORT_ZOOM;
    const innerHeight = (ERD_EXPORT_PAGE_HEIGHT_PX - ERD_EXPORT_PADDING_PX * 2) / ERD_EXPORT_ZOOM;
    const tiles = computeErdExportTiles({
      x: 0,
      y: 0,
      width: innerWidth * 2.5,
      height: innerHeight * 2.5,
    });
    expect(tiles.length).toBeGreaterThan(1);
  });

  it("uses overlap between adjacent tiles", () => {
    const innerWidth = (ERD_EXPORT_PAGE_WIDTH_PX - ERD_EXPORT_PADDING_PX * 2) / ERD_EXPORT_ZOOM;
    const tiles = computeErdExportTiles({
      x: 0,
      y: 0,
      width: innerWidth * 2.2,
      height: 200,
    });
    expect(tiles.length).toBeGreaterThanOrEqual(2);
    expect(tiles[1].x).toBeLessThan(tiles[0].x + tiles[0].width);
  });
});

describe("estimateExportPageCount", () => {
  it("matches computeErdExportTiles length", () => {
    const bounds = { x: 10, y: 20, width: 5000, height: 4000 };
    expect(estimateExportPageCount(bounds)).toBe(
      computeErdExportTiles(bounds, DEFAULT_ERD_EXPORT_TILE_OPTIONS).length,
    );
  });
});

describe("captureErdTiles", () => {
  it("passes width, height, and transform style to toPng", async () => {
    const htmlToImage = await import("html-to-image");
    const toPngSpy = vi.spyOn(htmlToImage, "toPng").mockResolvedValue(
      `data:image/png;base64,${"x".repeat(ERD_EXPORT_MIN_DATA_URL_LENGTH)}`,
    );
    const { captureErdTiles } = await import("./erd-export");

    const viewportElement = document.createElement("div");

    await captureErdTiles({
      tiles: [{ x: 0, y: 0, width: 400, height: 300 }],
      viewportElement,
      backgroundColor: "#ffffff",
    });

    expect(toPngSpy).toHaveBeenCalledWith(
      viewportElement,
      expect.objectContaining({
        width: ERD_EXPORT_PAGE_WIDTH_PX,
        height: ERD_EXPORT_PAGE_HEIGHT_PX,
        backgroundColor: "#ffffff",
        style: expect.objectContaining({
          width: `${ERD_EXPORT_PAGE_WIDTH_PX}px`,
          height: `${ERD_EXPORT_PAGE_HEIGHT_PX}px`,
          transform: expect.stringMatching(/^translate\(/),
        }),
      }),
    );

    toPngSpy.mockRestore();
    expect(document.documentElement.hasAttribute("data-erd-export")).toBe(false);
  });
});
