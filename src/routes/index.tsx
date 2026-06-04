import { createFileRoute } from "@tanstack/react-router";
import { Sidebar } from "@/components/kueri/Sidebar";
import { Workspace } from "@/components/kueri/Workspace";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "kueri.dev — modern database workspace" },
      { name: "description", content: "A fast, minimalist SQL workspace for managing connections, scripts and exports across environments." },
      { property: "og:title", content: "kueri.dev — modern database workspace" },
      { property: "og:description", content: "A fast, minimalist SQL workspace for developers." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="dark h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <Sidebar />
      <Workspace />
    </div>
  );
}
