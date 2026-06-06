import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SchemaExplorerPanel } from "@/components/kueri/SchemaExplorerPanel";

vi.mock("@/lib/api/schema", () => ({
  fetchConnectionSchema: vi.fn().mockResolvedValue({
    driver: "postgres",
    schemas: [{ name: "public", tables: [{ name: "users", kind: "table" }] }],
  }),
  fetchTableColumns: vi.fn().mockResolvedValue({
    schema: "public",
    table: "users",
    columns: [],
  }),
}));

vi.mock("@/components/kueri/SchemaErdPanel", () => ({
  SchemaErdPanel: () => <div data-testid="schema-erd-panel">ERD Panel</div>,
}));

function renderPanel() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SchemaExplorerPanel connectionId={1} connectionLabel="Dev" />
    </QueryClientProvider>,
  );
}

describe("SchemaExplorerPanel", () => {
  it("shows ERD tab entry point from schema view", () => {
    renderPanel();
    expect(screen.getByRole("tab", { name: /ERD/i })).toBeInTheDocument();
  });

  it("switches to ERD panel when ERD tab is clicked", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("tab", { name: /ERD/i }));
    expect(screen.getByTestId("schema-erd-panel")).toBeInTheDocument();
  });
});
