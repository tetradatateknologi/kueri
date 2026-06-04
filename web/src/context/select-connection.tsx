import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { ProductionEnvDialog } from "@/components/kueri/ProductionEnvDialog";
import { useAppUrl } from "@/context/app-url";
import { useWorkspaceStore, type SelectedConnection } from "@/stores/workspace-store";

type SelectConnectionContextValue = {
  selectConnection: (selected: SelectedConnection) => void;
};

const SelectConnectionContext = createContext<SelectConnectionContextValue | null>(null);

export function SelectConnectionProvider({ children }: { children: ReactNode }) {
  const setSelectedConnection = useWorkspaceStore((s) => s.setSelectedConnection);
  const { setActiveConnectionId } = useAppUrl();
  const [prodDialogOpen, setProdDialogOpen] = useState(false);
  const pendingConnection = useRef<SelectedConnection | null>(null);

  const applyConnection = useCallback(
    (selected: SelectedConnection) => {
      setSelectedConnection(selected);
      setActiveConnectionId(selected.connectionId);
    },
    [setSelectedConnection, setActiveConnectionId],
  );

  const selectConnection = useCallback(
    (selected: SelectedConnection) => {
      if (selected.env === "prod") {
        pendingConnection.current = selected;
        setProdDialogOpen(true);
        return;
      }
      applyConnection(selected);
    },
    [applyConnection],
  );

  const value = useMemo(() => ({ selectConnection }), [selectConnection]);

  return (
    <SelectConnectionContext.Provider value={value}>
      {children}
      <ProductionEnvDialog
        open={prodDialogOpen}
        onOpenChange={setProdDialogOpen}
        onConfirm={() => {
          if (pendingConnection.current) {
            applyConnection(pendingConnection.current);
            pendingConnection.current = null;
          }
          setProdDialogOpen(false);
        }}
      />
    </SelectConnectionContext.Provider>
  );
}

export function useSelectConnection() {
  const ctx = useContext(SelectConnectionContext);
  if (!ctx) {
    throw new Error("useSelectConnection must be used within SelectConnectionProvider");
  }
  return ctx;
}
