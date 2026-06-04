import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type AppView = "workspace" | "settings";

export type SettingsSection = "guide" | "shortcuts" | "contribute";

type AppViewContextValue = {
  view: AppView;
  settingsSection: SettingsSection;
  openWorkspace: () => void;
  openSettings: (section?: SettingsSection) => void;
};

const AppViewContext = createContext<AppViewContextValue | null>(null);

export function AppViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AppView>("workspace");
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("guide");

  const openWorkspace = useCallback(() => {
    setView("workspace");
  }, []);

  const openSettings = useCallback((section: SettingsSection = "guide") => {
    setSettingsSection(section);
    setView("settings");
  }, []);

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
