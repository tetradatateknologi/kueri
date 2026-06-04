import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KeyboardShortcutsGuide } from "@/components/kueri/KeyboardShortcutsGuide";

type KeyboardShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Quick-reference dialog; full guide lives in Settings. */
export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Ringkasan cepat. Buka Settings → Pintasan keyboard untuk panduan lengkap.
          </DialogDescription>
        </DialogHeader>
        <KeyboardShortcutsGuide className="mt-2" />
      </DialogContent>
    </Dialog>
  );
}
