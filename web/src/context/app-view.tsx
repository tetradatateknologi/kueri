import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAppUrl } from "@/context/app-url";
import { readAppUrlFromLocation } from "@/lib/app-url";

export type AppView = "workspace" | "settings";

export type SettingsSection = "guide" | "shortcuts" | "backup" | "about" | "contribute";

type AppViewContextValue = {
  view: AppView;
  settingsSection: SettingsSection;
  openWorkspace: () => void;
  openSettings: (section?: SettingsSection) => void;
};

const AppViewContext = createContext<AppViewContextValue | null>(null);

export function AppViewProvider({ children }: { children: ReactNode }) {
  const { syncAppView } = useAppUrl();
  const initialUrl = useMemo(() => readAppUrlFromLocation(), []);
  const [view, setView] = useState<AppView>(
    initialUrl.view === "settings" ? "settings" : "workspace",
  );
  const [settingsSection, setSettingsSection] = useState<SettingsSection>(
    initialUrl.settingsSection ?? "guide",
  );

  const openWorkspace = useCallback(() => {
    setView("workspace");
    syncAppView("workspace");
  }, [syncAppView]);

  const openSettings = useCallback(
    (section: SettingsSection = "guide") => {
      setSettingsSection(section);
      setView("settings");
      syncAppView("settings", section);
    },
    [syncAppView],
  );

  const value = useMemo(
    () => ({ view, settingsSection, openWorkspace, openSettings }),
    [view, settingsSection, openWorkspace, openSettings],
  );

  return <AppViewContext.Provider value={value}>{children}</AppViewContext.Provider>;
}

export function useAppView() {
  const ctx = useContext(AppViewContext);
  if (!ctx) throw new Error("useAppView must be used within AppViewProvider");
  return ctx;
}
