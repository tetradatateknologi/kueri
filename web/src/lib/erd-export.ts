import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { Node } from "@xyflow/react";
import { getNodesBounds, getViewportForBounds } from "@xyflow/react";

import { ERD_NODE_WIDTH, estimateTableNodeHeight, type ErdTableNodeData } from "@/lib/schema-erd";

export const ERD_EXPORT_PAGE_WIDTH_PX = 1920;
export const ERD_EXPORT_PAGE_HEIGHT_PX = 1080;
export const ERD_EXPORT_PADDING_PX = 48;
export const ERD_EXPORT_OVERLAP_RATIO = 0.1;
export const ERD_EXPORT_PIXEL_RATIO = 2;
export const ERD_EXPORT_PIXEL_RATIO_REDUCED = 1;
export const ERD_EXPORT_ADAPTIVE_PAGE_THRESHOLD = 6;
export const ERD_EXPORT_MAX_PAGES = 20;
export const ERD_EXPORT_WARN_TABLES = 50;
export const ERD_EXPORT_ZOOM = 1;
export const ERD_EXPORT_MIN_DATA_URL_LENGTH = 5000;

export const ERD_EXPORT_BACKGROUND_LIGHT = "#f8f9fb";
export const ERD_EXPORT_BACKGROUND_DARK = "#1c1f26";

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

export class ErdExportAbortedError extends Error {
  constructor() {
    super("Export cancelled");
    this.name = "ErdExportAbortedError";
  }
}

export function yieldToMainThread(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export function resolveAdaptivePixelRatio(tableCount: number, pageCount: number): number {
  if (tableCount >= ERD_EXPORT_WARN_TABLES || pageCount >= ERD_EXPORT_ADAPTIVE_PAGE_THRESHOLD) {
    return ERD_EXPORT_PIXEL_RATIO_REDUCED;
  }
  return ERD_EXPORT_PIXEL_RATIO;
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new ErdExportAbortedError();
  }
}

export function getErdExportBackgroundColor(): string {
  if (typeof document === "undefined") {
    return ERD_EXPORT_BACKGROUND_LIGHT;
  }
  return document.documentElement.classList.contains("dark")
    ? ERD_EXPORT_BACKGROUND_DARK
    : ERD_EXPORT_BACKGROUND_LIGHT;
}

export function enrichErdNodesForBounds(nodes: Node<ErdTableNodeData>[]): Node<ErdTableNodeData>[] {
  return nodes.map((node) => {
    if (node.width != null && node.height != null) {
      return node;
    }
    const table = node.data.table;
    return {
      ...node,
      width: node.width ?? ERD_NODE_WIDTH,
      height: node.height ?? estimateTableNodeHeight(table),
    };
  });
}

export function resolveErdNodesBounds(nodes: Node<ErdTableNodeData>[]): ErdExportRect {
  return getNodesBounds(enrichErdNodesForBounds(nodes));
}

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
  const rows = Math.max(
    1,
    Math.ceil((paddedBounds.height - tileFlowHeight * overlapRatio) / stepY),
  );

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

/** getViewportForBounds expects padding as a fraction (0–1), not pixels. */
export function toViewportPaddingFraction(paddingPx: number, pageWidthPx: number): number {
  return paddingPx / pageWidthPx;
}

export function resolveCaptureDimensions(
  tile: ErdExportRect,
  isSinglePage: boolean,
): { width: number; height: number } {
  if (isSinglePage) {
    return {
      width: Math.ceil(tile.width),
      height: Math.ceil(tile.height),
    };
  }

  return {
    width: ERD_EXPORT_PAGE_WIDTH_PX,
    height: ERD_EXPORT_PAGE_HEIGHT_PX,
  };
}

export type ErdCaptureOptions = {
  width: number;
  height: number;
  pixelRatio: number;
  backgroundColor: string;
  style: {
    width: string;
    height: string;
    transform: string;
  };
};

export type BuildErdCaptureOptionsParams = {
  outputWidth: number;
  outputHeight: number;
  backgroundColor?: string;
  pixelRatio?: number;
};

export function buildErdCaptureOptions(
  tile: ErdExportRect,
  params: BuildErdCaptureOptionsParams,
): ErdCaptureOptions {
  const { outputWidth, outputHeight } = params;
  const backgroundColor = params.backgroundColor ?? getErdExportBackgroundColor();
  const pixelRatio = params.pixelRatio ?? ERD_EXPORT_PIXEL_RATIO;
  const paddingFraction = toViewportPaddingFraction(ERD_EXPORT_PADDING_PX, outputWidth);

  const viewport = getViewportForBounds(tile, outputWidth, outputHeight, 0.05, 2, paddingFraction);

  return {
    width: outputWidth,
    height: outputHeight,
    pixelRatio,
    backgroundColor,
    style: {
      width: `${outputWidth}px`,
      height: `${outputHeight}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  };
}

export function parseCaptureTransformZoom(transform: string): number {
  const match = transform.match(/scale\(([^)]+)\)/);
  return match ? Number.parseFloat(match[1]) : 0;
}

export function shouldIncludeErdExportNode(node: HTMLElement): boolean {
  const classList = node.classList;
  return !(
    classList.contains("react-flow__minimap") ||
    classList.contains("react-flow__controls") ||
    classList.contains("react-flow__panel")
  );
}

export function assertNonEmptyDataUrl(dataUrl: string, pageIndex: number): void {
  if (dataUrl.length < ERD_EXPORT_MIN_DATA_URL_LENGTH) {
    throw new Error(
      `Export produced an empty image for page ${pageIndex + 1}. Try again or filter tables.`,
    );
  }
}

export type CapturedErdImage = {
  dataUrl: string;
  width: number;
  height: number;
};

export type CaptureErdTilesInput = {
  tiles: ErdExportRect[];
  viewportElement: HTMLElement;
  backgroundColor?: string;
  pixelRatio?: number;
  signal?: AbortSignal;
  onProgress?: (current: number, total: number) => void;
};

export async function captureErdTiles(input: CaptureErdTilesInput): Promise<CapturedErdImage[]> {
  const { tiles, viewportElement, onProgress, signal } = input;
  const backgroundColor = input.backgroundColor ?? getErdExportBackgroundColor();
  const pixelRatio = input.pixelRatio ?? ERD_EXPORT_PIXEL_RATIO;
  const isSinglePage = tiles.length === 1;
  const images: CapturedErdImage[] = [];

  document.documentElement.setAttribute("data-erd-export", "");

  try {
    for (let index = 0; index < tiles.length; index += 1) {
      assertNotAborted(signal);
      await yieldToMainThread();

      const tile = tiles[index];
      const { width, height } = resolveCaptureDimensions(tile, isSinglePage);
      const captureOptions = buildErdCaptureOptions(tile, {
        outputWidth: width,
        outputHeight: height,
        backgroundColor,
        pixelRatio,
      });

      const dataUrl = await toPng(viewportElement, {
        width: captureOptions.width,
        height: captureOptions.height,
        pixelRatio: captureOptions.pixelRatio,
        backgroundColor: captureOptions.backgroundColor,
        cacheBust: index === 0,
        style: captureOptions.style,
        filter: (node) => {
          if (!(node instanceof HTMLElement)) return true;
          return shouldIncludeErdExportNode(node);
        },
      });

      assertNonEmptyDataUrl(dataUrl, index);
      images.push({ dataUrl, width, height });

      onProgress?.(index + 1, tiles.length);
      await yieldToMainThread();
      assertNotAborted(signal);
    }
  } finally {
    document.documentElement.removeAttribute("data-erd-export");
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
  images: CapturedErdImage[],
  baseName: string,
): Promise<ErdExportBuildResult> {
  const firstPage = images[0];
  const pdf = new jsPDF({
    orientation: firstPage.width >= firstPage.height ? "landscape" : "portrait",
    unit: "px",
    format: [firstPage.width, firstPage.height],
    compress: true,
  });

  for (let index = 0; index < images.length; index += 1) {
    const page = images[index];
    if (index > 0) {
      pdf.addPage([page.width, page.height], page.width >= page.height ? "landscape" : "portrait");
    }
    pdf.addImage(page.dataUrl, "PNG", 0, 0, page.width, page.height, undefined, "FAST");
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
  viewportElement: HTMLElement;
  baseName: string;
  format: "png" | "pdf";
  tableCount: number;
  backgroundColor?: string;
  signal?: AbortSignal;
  onProgress?: (current: number, total: number) => void;
};

export async function exportErdDiagram(
  input: ExportErdDiagramInput,
): Promise<ErdExportBuildResult> {
  const bounds = resolveErdNodesBounds(input.nodes);
  const tiles = computeErdExportTiles(bounds);
  if (tiles.length > ERD_EXPORT_MAX_PAGES) {
    throw new Error(
      `Diagram requires ${tiles.length} pages. Filter tables to stay within ${ERD_EXPORT_MAX_PAGES} pages.`,
    );
  }

  const pixelRatio = resolveAdaptivePixelRatio(input.tableCount, tiles.length);

  const capturedImages = await captureErdTiles({
    tiles,
    viewportElement: input.viewportElement,
    backgroundColor: input.backgroundColor,
    pixelRatio,
    signal: input.signal,
    onProgress: input.onProgress,
  });

  if (input.format === "png") {
    return buildPngExport(
      capturedImages.map((image) => image.dataUrl),
      input.baseName,
    );
  }
  return buildPdfExport(capturedImages, input.baseName);
}
