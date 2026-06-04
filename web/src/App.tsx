import type { CSSProperties } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiStatus } from "@/components/ApiStatus";
import { DesktopWelcomeGate } from "@/components/kueri/DesktopWelcomeGate";
import { SettingsView } from "@/components/kueri/SettingsView";
import { Sidebar } from "@/components/kueri/Sidebar";
import { Workspace } from "@/components/kueri/Workspace";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AppViewProvider, useAppView } from "@/context/app-view";
import { KueriAppProvider } from "@/context/kueri-app";
import { SelectConnectionProvider } from "@/context/select-connection";

function MainContent() {
  const { view } = useAppView();
  return view === "settings" ? <SettingsView /> : <Workspace />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <KueriAppProvider>
        <AppViewProvider>
        <SelectConnectionProvider>
          <DesktopWelcomeGate>
          <SidebarProvider
            className="dark !min-h-0 h-screen w-screen overflow-hidden bg-background text-foreground"
            style={{ "--sidebar-width": "18rem" } as CSSProperties}
          >
            <Sidebar />
            <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ApiStatus />
              <MainContent />
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
          </DesktopWelcomeGate>
        </SelectConnectionProvider>
        </AppViewProvider>
      </KueriAppProvider>
    </QueryClientProvider>
  );
}
