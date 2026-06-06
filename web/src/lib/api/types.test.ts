import { describe, expect, it } from "vitest";

import type { ExecuteQueryInput } from "./types";

describe("ExecuteQueryInput", () => {
  it("uses connection_id for query execution", () => {
    const input: ExecuteQueryInput = {
      sql: "SELECT 1",
      connection_id: 42,
    };
    expect(input.connection_id).toBe(42);
    expect(JSON.stringify(input)).toContain("connection_id");
  });

  it("supports optional pagination fields", () => {
    const input: ExecuteQueryInput = {
      sql: "SELECT * FROM users",
      connection_id: 42,
      limit: 20,
      offset: 40,
    };
    expect(JSON.stringify(input)).toContain('"offset":40');
    expect(JSON.stringify(input)).toContain('"limit":20');
  });
});
