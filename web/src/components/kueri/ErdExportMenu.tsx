import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { Node } from "@xyflow/react";
import { Download, FileImage, FileText, Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ERD_EXPORT_MAX_PAGES,
  ERD_EXPORT_PIXEL_RATIO,
  ERD_EXPORT_PIXEL_RATIO_REDUCED,
  ERD_EXPORT_WARN_TABLES,
  ErdExportAbortedError,
  estimateExportPageCount,
  exportErdDiagram,
  getErdExportBackgroundColor,
  resolveAdaptivePixelRatio,
  resolveErdNodesBounds,
} from "@/lib/erd-export";
import { downloadBlob, formatErdExportFilename } from "@/lib/export-utils";
import type { ErdTableNodeData } from "@/lib/schema-erd";
import {
  showErdExportToast,
  showExportCancelledToast,
  showQueryErrorToast,
  showValidationError,
} from "@/lib/toasts";
import type { WorkspaceEnv } from "@/stores/workspace-store";
import { cn } from "@/lib/utils";

type ErdExportProgress = {
  current: number;
  total: number;
};

type ErdExportMenuProps = {
  nodes: Node<ErdTableNodeData>[];
  visibleTableCount: number;
  canvasContainerRef: MutableRefObject<HTMLDivElement | null>;
  cancelExportRef?: MutableRefObject<(() => void) | null>;
  projectName: string;
  env: WorkspaceEnv;
  userSlug: string;
  disabled?: boolean;
  onExportProgress: (progress: ErdExportProgress | null) => void;
};

export function ErdExportMenu({
  nodes,
  visibleTableCount,
  canvasContainerRef,
  cancelExportRef,
  projectName,
  env,
  userSlug,
  disabled,
  onExportProgress,
}: ErdExportMenuProps) {
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingFormat, setPendingFormat] = useState<"png" | "pdf" | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const confirmPageCount = estimateExportPageCount(resolveErdNodesBounds(nodes));
  const confirmPixelRatio = resolveAdaptivePixelRatio(visibleTableCount, confirmPageCount);
  const usesReducedQuality = confirmPixelRatio === ERD_EXPORT_PIXEL_RATIO_REDUCED;

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (cancelExportRef) {
        cancelExportRef.current = null;
      }
    };
  }, [cancelExportRef]);

  const runExport = async (format: "png" | "pdf") => {
    if (nodes.length === 0) {
      showValidationError("No diagram to export");
      return;
    }

    const viewportElement = canvasContainerRef.current?.querySelector(
      ".react-flow__viewport",
    ) as HTMLElement | null;
    if (!viewportElement) {
      showValidationError("Diagram canvas is not ready yet");
      return;
    }

    const bounds = resolveErdNodesBounds(nodes);
    const pageCount = estimateExportPageCount(bounds);
    if (pageCount > ERD_EXPORT_MAX_PAGES) {
      showValidationError(
        `Diagram requires ${pageCount} pages. Filter tables to stay within ${ERD_EXPORT_MAX_PAGES} pages.`,
      );
      return;
    }

    const baseName = formatErdExportFilename({
      project: projectName.toLowerCase().replace(/\s+/g, "_"),
      env,
      user: userSlug,
    });

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    if (cancelExportRef) {
      cancelExportRef.current = () => abortController.abort();
    }

    setExporting(true);
    onExportProgress({ current: 0, total: pageCount });

    try {
      const result = await exportErdDiagram({
        nodes,
        viewportElement,
        baseName,
        format,
        tableCount: visibleTableCount,
        backgroundColor: getErdExportBackgroundColor(),
        signal: abortController.signal,
        onProgress: (current, total) => onExportProgress({ current, total }),
      });

      downloadBlob(result.filename, result.blob);
      showErdExportToast({
        filename: result.filename,
        format,
        pageCount: result.pageCount,
      });
    } catch (error) {
      if (error instanceof ErdExportAbortedError) {
        showExportCancelledToast();
        return;
      }
      const message = error instanceof Error ? error.message : "Failed to export ERD";
      showQueryErrorToast(message, "Export failed");
    } finally {
      abortControllerRef.current = null;
      if (cancelExportRef) {
        cancelExportRef.current = null;
      }
      setExporting(false);
      onExportProgress(null);
    }
  };

  const handleExport = (format: "png" | "pdf") => {
    if (visibleTableCount >= ERD_EXPORT_WARN_TABLES) {
      setPendingFormat(format);
      setConfirmOpen(true);
      return;
    }
    void runExport(format);
  };

  const handleConfirmExport = () => {
    if (!pendingFormat) return;
    const format = pendingFormat;
    setPendingFormat(null);
    setConfirmOpen(false);
    void runExport(format);
  };

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={disabled || exporting}
                aria-label="Export diagram"
                className={cn(
                  "p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-1 disabled:opacity-40",
                )}
              >
                {exporting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Export diagram
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem disabled={exporting} onClick={() => handleExport("png")}>
            <FileImage className="size-3.5 mr-2" />
            Export as PNG
          </DropdownMenuItem>
          <DropdownMenuItem disabled={exporting} onClick={() => handleExport("pdf")}>
            <FileText className="size-3.5 mr-2" />
            Export as PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setPendingFormat(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export large diagram?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This export includes {visibleTableCount} tables across approximately{" "}
                  {confirmPageCount} page{confirmPageCount === 1 ? "" : "s"} and may take a while.
                  Consider filtering by schema or hiding tables before exporting.
                </p>
                {usesReducedQuality && (
                  <p>
                    Reduced quality mode will be used (pixel ratio {ERD_EXPORT_PIXEL_RATIO_REDUCED}{" "}
                    instead of {ERD_EXPORT_PIXEL_RATIO}) to keep the browser responsive.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmExport}>Export anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
