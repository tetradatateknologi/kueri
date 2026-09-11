import { describe, expect, it } from "vitest";

import {
  computeErdExportTiles,
  DEFAULT_ERD_EXPORT_TILE_OPTIONS,
  estimateExportPageCount,
  ERD_EXPORT_PAGE_HEIGHT_PX,
  ERD_EXPORT_PAGE_WIDTH_PX,
  ERD_EXPORT_PADDING_PX,
  ERD_EXPORT_ZOOM,
} from "./erd-export";

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
