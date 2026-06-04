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
    onError: () => showValidationError("Gagal mengekspor cadangan."),
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
        `Impor selesai: ${result.workspaces} workspace, ${result.connections} koneksi, ${result.scripts} skrip` +
          (result.skipped ? ` (${result.skipped} dilewati)` : ""),
      );
      setPendingFile(null);
    },
    onError: (err) => {
      showValidationError(err instanceof Error ? err.message : "Gagal mengimpor cadangan.");
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
      showValidationError(err instanceof Error ? err.message : "File cadangan tidak valid.");
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
        <h2 className="text-lg font-semibold">Cadangan & pemindahan data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ekspor atau impor workspace, koneksi, skrip, dan preferensi UI sebagai file JSON — berguna saat
          pindah perangkat desktop.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-surface-1/30 p-4 space-y-3">
        <h3 className="text-sm font-semibold">Ekspor</h3>
        <p className="text-sm text-muted-foreground">
          Menyimpan semua data aplikasi ke <span className="font-mono text-xs">kueri-backup-YYYY-MM-DD.json</span>.
          Password koneksi disertakan — simpan file di tempat aman.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={exportMutation.isPending}
          onClick={() => exportMutation.mutate()}
        >
          <Download className="size-3.5" />
          Ekspor cadangan JSON
        </Button>
      </section>

      <section className="rounded-lg border border-border bg-surface-1/30 p-4 space-y-4">
        <h3 className="text-sm font-semibold">Impor</h3>
        <p className="text-sm text-muted-foreground">
          Pulihkan data dari file cadangan Kueri. Pilih mode impor sebelum memilih file.
        </p>

        <RadioGroup
          value={importMode}
          onValueChange={(value) => setImportMode(value as BackupImportMode)}
          className="space-y-2"
        >
          <div className="flex items-start gap-2 rounded-md border border-border/70 p-3">
            <RadioGroupItem value="merge" id="import-merge" className="mt-0.5" />
            <Label htmlFor="import-merge" className="cursor-pointer space-y-1 font-normal">
              <span className="block text-sm font-medium text-foreground">Gabung (merge)</span>
              <span className="block text-xs text-muted-foreground">
                Tambahkan workspace/koneksi/skrip baru. Item duplikat dilewati.
              </span>
            </Label>
          </div>
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <RadioGroupItem value="replace" id="import-replace" className="mt-0.5" />
            <Label htmlFor="import-replace" className="cursor-pointer space-y-1 font-normal">
              <span className="block text-sm font-medium text-foreground">Ganti semua (replace)</span>
              <span className="block text-xs text-muted-foreground">
                Hapus data lokal lalu ganti dengan isi cadangan. Tindakan ini tidak bisa dibatalkan.
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
          Pilih file cadangan…
        </Button>
      </section>

      <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
        <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5" aria-hidden />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Format cadangan v1</p>
          <p>
            File JSON berisi workspace, koneksi (termasuk password), skrip tersimpan, tag, favorit, dan
            preferensi UI lokal (riwayat query, tampilan hasil).
          </p>
        </div>
      </section>

      <AlertDialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ganti semua data?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua workspace, koneksi, dan skrip saat ini akan dihapus lalu diganti dengan isi cadangan.
              Pastikan Anda sudah mengekspor data lama jika masih diperlukan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void confirmReplaceImport();
              }}
            >
              Ganti semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
