import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiStatus } from "@/components/ApiStatus";
import { Sidebar } from "@/components/kueri/Sidebar";
import { Workspace } from "@/components/kueri/Workspace";
import { KueriAppProvider } from "@/context/kueri-app";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <KueriAppProvider>
        <div className="dark h-screen w-screen flex bg-background text-foreground overflow-hidden">
          <Sidebar />
          <Workspace />
          <ApiStatus />
        </div>
      </KueriAppProvider>
    </QueryClientProvider>
  );
}
