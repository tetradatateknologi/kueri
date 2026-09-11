import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { Node } from "@xyflow/react";
import { getViewportForBounds } from "@xyflow/react";

import type { ErdTableNodeData } from "@/lib/schema-erd";

export const ERD_EXPORT_PAGE_WIDTH_PX = 1920;
export const ERD_EXPORT_PAGE_HEIGHT_PX = 1080;
export const ERD_EXPORT_PADDING_PX = 48;
export const ERD_EXPORT_OVERLAP_RATIO = 0.1;
export const ERD_EXPORT_PIXEL_RATIO = 2;
export const ERD_EXPORT_MAX_PAGES = 20;
export const ERD_EXPORT_WARN_TABLES = 50;
export const ERD_EXPORT_ZOOM = 1;

export type ErdExportRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ErdExportTileOptions = {
  pageWidthPx: number;
  pageHeightPx: number;
  paddingPx: number;
  overlapRatio: number;
  zoom: number;
};

export const DEFAULT_ERD_EXPORT_TILE_OPTIONS: ErdExportTileOptions = {
  pageWidthPx: ERD_EXPORT_PAGE_WIDTH_PX,
  pageHeightPx: ERD_EXPORT_PAGE_HEIGHT_PX,
  paddingPx: ERD_EXPORT_PADDING_PX,
  overlapRatio: ERD_EXPORT_OVERLAP_RATIO,
  zoom: ERD_EXPORT_ZOOM,
};

export function computeErdExportTiles(
  bounds: ErdExportRect,
  options: ErdExportTileOptions = DEFAULT_ERD_EXPORT_TILE_OPTIONS,
): ErdExportRect[] {
  const { pageWidthPx, pageHeightPx, paddingPx, overlapRatio, zoom } = options;

  const innerWidthPx = pageWidthPx - paddingPx * 2;
  const innerHeightPx = pageHeightPx - paddingPx * 2;
  const tileFlowWidth = innerWidthPx / zoom;
  const tileFlowHeight = innerHeightPx / zoom;
  const paddingFlow = paddingPx / zoom;

  const paddedBounds: ErdExportRect = {
    x: bounds.x - paddingFlow,
    y: bounds.y - paddingFlow,
    width: bounds.width + paddingFlow * 2,
    height: bounds.height + paddingFlow * 2,
  };

  if (paddedBounds.width <= tileFlowWidth && paddedBounds.height <= tileFlowHeight) {
    return [paddedBounds];
  }

  const stepX = tileFlowWidth * (1 - overlapRatio);
  const stepY = tileFlowHeight * (1 - overlapRatio);
  const cols = Math.max(1, Math.ceil((paddedBounds.width - tileFlowWidth * overlapRatio) / stepX));
  const rows = Math.max(1, Math.ceil((paddedBounds.height - tileFlowHeight * overlapRatio) / stepY));

  const tiles: ErdExportRect[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      tiles.push({
        x: paddedBounds.x + col * stepX,
        y: paddedBounds.y + row * stepY,
        width: tileFlowWidth,
        height: tileFlowHeight,
      });
    }
  }

  return tiles;
}

export function estimateExportPageCount(
  bounds: ErdExportRect,
  options: ErdExportTileOptions = DEFAULT_ERD_EXPORT_TILE_OPTIONS,
): number {
  return computeErdExportTiles(bounds, options).length;
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export type CaptureErdTilesInput = {
  tiles: ErdExportRect[];
  viewportElement: HTMLElement;
  getViewport: () => { x: number; y: number; zoom: number };
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  onProgress?: (current: number, total: number) => void;
};

export async function captureErdTiles(input: CaptureErdTilesInput): Promise<string[]> {
  const { tiles, viewportElement, getViewport, setViewport, onProgress } = input;
  const originalViewport = getViewport();
  const images: string[] = [];

  try {
    for (let index = 0; index < tiles.length; index += 1) {
      const tile = tiles[index];
      const viewport = getViewportForBounds(
        tile,
        ERD_EXPORT_PAGE_WIDTH_PX,
        ERD_EXPORT_PAGE_HEIGHT_PX,
        0.05,
        2,
        ERD_EXPORT_PADDING_PX,
      );
      setViewport(viewport);
      await nextFrame();
      onProgress?.(index + 1, tiles.length);

      const dataUrl = await toPng(viewportElement, {
        pixelRatio: ERD_EXPORT_PIXEL_RATIO,
        cacheBust: true,
        skipFonts: true,
      });
      images.push(dataUrl);
    }
  } finally {
    setViewport(originalViewport);
    await nextFrame();
  }

  return images;
}

export type ErdExportBuildResult = {
  filename: string;
  blob: Blob;
  pageCount: number;
};

export async function buildPngExport(
  images: string[],
  baseName: string,
): Promise<ErdExportBuildResult> {
  if (images.length === 1) {
    const blob = await dataUrlToBlob(images[0]);
    return {
      filename: `${baseName}.png`,
      blob,
      pageCount: 1,
    };
  }

  const zip = new JSZip();
  for (let index = 0; index < images.length; index += 1) {
    const blob = await dataUrlToBlob(images[index]);
    zip.file(`page-${String(index + 1).padStart(2, "0")}.png`, blob);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  return {
    filename: `${baseName}.zip`,
    blob,
    pageCount: images.length,
  };
}

export async function buildPdfExport(
  images: string[],
  baseName: string,
): Promise<ErdExportBuildResult> {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [ERD_EXPORT_PAGE_WIDTH_PX, ERD_EXPORT_PAGE_HEIGHT_PX],
    compress: true,
  });

  for (let index = 0; index < images.length; index += 1) {
    if (index > 0) {
      pdf.addPage([ERD_EXPORT_PAGE_WIDTH_PX, ERD_EXPORT_PAGE_HEIGHT_PX], "landscape");
    }
    pdf.addImage(
      images[index],
      "PNG",
      0,
      0,
      ERD_EXPORT_PAGE_WIDTH_PX,
      ERD_EXPORT_PAGE_HEIGHT_PX,
      undefined,
      "FAST",
    );
  }

  const blob = pdf.output("blob");
  return {
    filename: `${baseName}.pdf`,
    blob,
    pageCount: images.length,
  };
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

export type ExportErdDiagramInput = {
  nodes: Node<ErdTableNodeData>[];
  bounds: ErdExportRect;
  viewportElement: HTMLElement;
  getViewport: () => { x: number; y: number; zoom: number };
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  baseName: string;
  format: "png" | "pdf";
  onProgress?: (current: number, total: number) => void;
};

export async function exportErdDiagram(input: ExportErdDiagramInput): Promise<ErdExportBuildResult> {
  const tiles = computeErdExportTiles(input.bounds);
  if (tiles.length > ERD_EXPORT_MAX_PAGES) {
    throw new Error(
      `Diagram requires ${tiles.length} pages. Filter tables to stay within ${ERD_EXPORT_MAX_PAGES} pages.`,
    );
  }

  const images = await captureErdTiles({
    tiles,
    viewportElement: input.viewportElement,
    getViewport: input.getViewport,
    setViewport: input.setViewport,
    onProgress: input.onProgress,
  });

  if (input.format === "png") {
    return buildPngExport(images, input.baseName);
  }
  return buildPdfExport(images, input.baseName);
}
