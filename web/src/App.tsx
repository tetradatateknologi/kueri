import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiStatus } from "@/components/ApiStatus";
import { Sidebar } from "@/components/kueri/Sidebar";
import { Workspace } from "@/components/kueri/Workspace";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="dark h-screen w-screen flex bg-background text-foreground overflow-hidden">
        <Sidebar />
        <Workspace />
        <ApiStatus />
      </div>
    </QueryClientProvider>
  );
}
