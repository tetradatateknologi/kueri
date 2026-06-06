import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SchemaErdPanel } from "@/components/kueri/SchemaErdPanel";
import type { ErdMetadata } from "@/lib/api/erd";

vi.mock("@xyflow/react", async () => {
  const actual = await vi.importActual<typeof import("@xyflow/react")>("@xyflow/react");
  return {
    ...actual,
    ReactFlow: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="react-flow">{children}</div>
    ),
    Background: () => null,
    Controls: () => null,
    MiniMap: () => null,
  };
});

const sampleErd: ErdMetadata = {
  connectionId: 1,
  database: "app",
  driver: "postgres",
  schemas: ["public"],
  tables: [
    {
      id: "public.users",
      schema: "public",
      name: "users",
      columns: [
        {
          name: "id",
          dataType: "bigint",
          isNullable: false,
          isPrimaryKey: true,
          isForeignKey: false,
        },
        {
          name: "port_id",
          dataType: "bigint",
          isNullable: true,
          isPrimaryKey: false,
          isForeignKey: true,
        },
      ],
    },
    {
      id: "public.ports",
      schema: "public",
      name: "ports",
      columns: [
        {
          name: "id",
          dataType: "bigint",
          isNullable: false,
          isPrimaryKey: true,
          isForeignKey: false,
        },
      ],
    },
  ],
  relations: [
    {
      id: "rel1",
      sourceSchema: "public",
      sourceTable: "users",
      sourceColumn: "port_id",
      targetSchema: "public",
      targetTable: "ports",
      targetColumn: "id",
    },
  ],
};

vi.mock("@/lib/api/erd", () => ({
  fetchConnectionErd: vi.fn(),
}));

import { fetchConnectionErd } from "@/lib/api/erd";

function renderPanel(connectionId: number | null = 1) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SchemaErdPanel connectionId={connectionId} connectionLabel="Dev DB" />
    </QueryClientProvider>,
  );
}

describe("SchemaErdPanel", () => {
  it("shows prompt when no connection is selected", () => {
    renderPanel(null);
    expect(screen.getByText(/Select a connection/i)).toBeInTheDocument();
  });

  it("shows loading state while metadata is fetched", () => {
    vi.mocked(fetchConnectionErd).mockReturnValue(new Promise(() => {}));
    renderPanel(1);
    expect(screen.getByText(/Loading ERD metadata/i)).toBeInTheDocument();
  });

  it("renders table nodes and relationship notice", async () => {
    vi.mocked(fetchConnectionErd).mockResolvedValue(sampleErd);
    renderPanel(1);
    await waitFor(() => {
      expect(screen.getByTestId("react-flow")).toBeInTheDocument();
    });
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("ports")).toBeInTheDocument();
  });

  it("shows empty state when no tables exist", async () => {
    vi.mocked(fetchConnectionErd).mockResolvedValue({
      ...sampleErd,
      tables: [],
      relations: [],
    });
    renderPanel(1);
    await waitFor(() => {
      expect(screen.getByText(/No tables found/i)).toBeInTheDocument();
    });
  });

  it("shows error state when metadata API fails", async () => {
    vi.mocked(fetchConnectionErd).mockRejectedValue(new Error("network"));
    renderPanel(1);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load ERD metadata/i)).toBeInTheDocument();
    });
  });

  it("toggles table visibility from the checklist", async () => {
    vi.mocked(fetchConnectionErd).mockResolvedValue(sampleErd);
    renderPanel(1);
    await waitFor(() => {
      expect(screen.getByText("ports")).toBeInTheDocument();
    });
    const portsToggle = screen.getByRole("checkbox", { name: "ports" });
    fireEvent.click(portsToggle);
    expect(portsToggle).toHaveAttribute("aria-checked", "false");
  });
});
