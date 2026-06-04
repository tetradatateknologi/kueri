import { useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Upload } from "lucide-react";

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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { importBackupData, exportBackupData } from "@/lib/api/backup";
import {
  applyLocalBackupSettings,
  buildBackupFile,
  collectLocalBackupSettings,
  downloadBackupFile,
  parseBackupFile,
  toServerBackupPayload,
} from "@/lib/backup";
import type { BackupImportMode, KueriBackupFile } from "@/lib/backup/types";
import { showSuccess, showValidationError } from "@/lib/toasts";

export function SettingsBackupSection() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<BackupImportMode>("merge");
  const [pendingFile, setPendingFile] = useState<KueriBackupFile | null>(null);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const server = await exportBackupData();
      const file = buildBackupFile(server, collectLocalBackupSettings());
      downloadBackupFile(file);
    },
    onError: () => showValidationError("Failed to export backup."),
  });

  const importMutation = useMutation({
    mutationFn: async (backup: KueriBackupFile) => {
      const result = await importBackupData(importMode, toServerBackupPayload(backup));
      applyLocalBackupSettings(backup.settings);
      await queryClient.invalidateQueries();
      return result;
    },
    onSuccess: (result) => {
      showSuccess(
        `Import complete: ${result.workspaces} workspace(s), ${result.connections} connection(s), ${result.scripts} script(s)` +
          (result.skipped ? ` (${result.skipped} skipped)` : ""),
      );
      setPendingFile(null);
    },
    onError: (err) => {
      showValidationError(err instanceof Error ? err.message : "Failed to import backup.");
    },
  });

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseBackupFile(JSON.parse(text) as unknown);
      if (importMode === "replace") {
        setPendingFile(parsed);
        setReplaceConfirmOpen(true);
      } else {
        await importMutation.mutateAsync(parsed);
      }
    } catch (err) {
      showValidationError(err instanceof Error ? err.message : "Invalid backup file.");
    }
  };

  const confirmReplaceImport = async () => {
    if (!pendingFile) return;
    setReplaceConfirmOpen(false);
    await importMutation.mutateAsync(pendingFile);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold">Backup & data migration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Export or import workspaces, connections, scripts, and UI preferences as a JSON file —
          useful when moving to another desktop device.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-surface-1/30 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Export</h3>
        <p className="text-sm text-muted-foreground">
          Saves all application data to{" "}
          <span className="font-mono text-xs">kueri-backup-YYYY-MM-DD.json</span>. Connection
          passwords are included — store the file somewhere safe.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={exportMutation.isPending}
          onClick={() => exportMutation.mutate()}
        >
          <Download className="size-3.5" />
          Export JSON backup
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-surface-1/30 p-4 space-y-4">
        <h3 className="text-sm font-semibold">Import</h3>
        <p className="text-sm text-muted-foreground">
          Restore data from a Kueri backup file. Choose an import mode before selecting a file.
        </p>

        <RadioGroup
          value={importMode}
          onValueChange={(value) => setImportMode(value as BackupImportMode)}
          className="space-y-2"
        >
          <div className="flex items-start gap-2 rounded-md border border-border/70 p-3">
            <RadioGroupItem value="merge" id="import-merge" className="mt-0.5" />
            <Label htmlFor="import-merge" className="cursor-pointer space-y-1 font-normal">
              <span className="block text-sm font-medium text-foreground">Merge</span>
              <span className="block text-xs text-muted-foreground">
                Add new workspaces, connections, and scripts. Duplicate items are skipped.
              </span>
            </Label>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <RadioGroupItem value="replace" id="import-replace" className="mt-0.5" />
            <Label htmlFor="import-replace" className="cursor-pointer space-y-1 font-normal">
              <span className="block text-sm font-medium text-foreground">Replace all</span>
              <span className="block text-xs text-muted-foreground">
                Delete local data and replace it with the backup contents. This cannot be undone.
              </span>
            </Label>
          </div>
        </RadioGroup>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          size="sm"
          disabled={importMutation.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          Choose backup file…
        </Button>
      </section>

      <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
        <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" aria-hidden />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Backup format v1</p>
          <p>
            The JSON file includes workspaces, connections (including passwords), saved scripts,
            tags, favorites, and local UI preferences (query history, results view).
          </p>
        </div>
      </section>

      <AlertDialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace all data?</AlertDialogTitle>
            <AlertDialogDescription>
              All current workspaces, connections, and scripts will be deleted and replaced with the
              backup contents. Export your existing data first if you still need it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmReplaceImport();
              }}
            >
              Replace all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
