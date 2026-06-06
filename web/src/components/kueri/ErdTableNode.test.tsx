import { ReactFlowProvider } from "@xyflow/react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ErdTableNode } from "@/components/kueri/ErdTableNode";
import type { ErdTableNodeData } from "@/lib/schema-erd";

const tableData: ErdTableNodeData = {
  table: {
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
  showSchemaLabel: true,
  schemaLabel: "public",
  highlighted: false,
  searchTerm: "",
};

describe("ErdTableNode", () => {
  it("renders table name, columns, and key indicators", () => {
    const props = {
      id: "public.users",
      type: "erdTable",
      data: tableData,
      selected: false,
    } as React.ComponentProps<typeof ErdTableNode>;
    render(
      <ReactFlowProvider>
        <ErdTableNode {...props} />
      </ReactFlowProvider>,
    );

    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("port_id")).toBeInTheDocument();
    expect(screen.getByLabelText("Primary key")).toBeInTheDocument();
    expect(screen.getByLabelText("Foreign key")).toBeInTheDocument();
  });
});
