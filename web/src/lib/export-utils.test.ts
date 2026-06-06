import { describe, expect, it } from "vitest";

import { envToApiEnv, formatExportFilename, inferTableName, resultToCsv } from "./export-utils";
import type { QueryResult } from "@/lib/api/types";

describe("formatExportFilename", () => {
  it("replaces all tokens", () => {
    const name = formatExportFilename("{{project}}_{{env}}_{{table}}_{{date}}", {
      project: "ecommerce",
      env: "Production",
      table: "orders",
      user: "alex.dev",
      date: new Date("2026-06-04"),
    });
    expect(name).toBe("ecommerce_production_orders_2026-06-04");
  });
});

describe("envToApiEnv", () => {
  it("maps display env to API values", () => {
    expect(envToApiEnv("Development")).toBe("development");
    expect(envToApiEnv("Staging")).toBe("staging");
    expect(envToApiEnv("Production")).toBe("production");
  });
});

describe("inferTableName", () => {
  it("extracts table from FROM clause", () => {
    expect(inferTableName("SELECT * FROM orders WHERE id = 1")).toBe("orders");
  });

  it("falls back to results", () => {
    expect(inferTableName("SELECT 1")).toBe("results");
  });
});

describe("resultToCsv", () => {
  it("escapes commas and quotes", () => {
    const result: QueryResult = {
      columns: [
        { name: "name", filterable: true },
        { name: "note", filterable: true },
      ],
      rows: [["Ava", 'said "hi"']],
      rowCount: 1,
      durationMs: 1,
      cached: false,
      limit: 20,
      offset: 0,
      hasMore: false,
      autoLimitApplied: true,
      filtering: {
        enabled: true,
        mode: "server",
        appliedFilters: [],
      },
    };
    expect(resultToCsv(result)).toBe('name,note\nAva,"said ""hi"""');
  });
});
