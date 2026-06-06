import { describe, expect, it } from "vitest";

import { analyzeQueryFilterEligibility } from "@/lib/query-filter-eligibility";

describe("analyzeQueryFilterEligibility", () => {
  it("enables simple SELECT queries", () => {
    const result = analyzeQueryFilterEligibility({
      sql: "SELECT id, name FROM users",
      columns: [
        { name: "id", filterable: true },
        { name: "name", filterable: true },
      ],
    });
    expect(result.enabled).toBe(true);
    expect(result.strategy).toBe("server-wrapper");
  });

  it("disables non-SELECT queries", () => {
    const result = analyzeQueryFilterEligibility({
      sql: "DELETE FROM users",
      columns: [],
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toMatch(/SELECT/i);
  });

  it("disables duplicate column names", () => {
    const result = analyzeQueryFilterEligibility({
      sql: "SELECT id, id FROM users",
      columns: [
        { name: "id", filterable: true },
        { name: "id", filterable: true },
      ],
    });
    expect(result.enabled).toBe(false);
    expect(result.reason).toMatch(/Duplicate column names/i);
  });

  it("disables UNION queries", () => {
    const result = analyzeQueryFilterEligibility({
      sql: "SELECT * FROM users UNION SELECT * FROM archived_users",
      columns: [],
    });
    expect(result.enabled).toBe(false);
  });

  it("disables GROUP BY queries", () => {
    const result = analyzeQueryFilterEligibility({
      sql: "SELECT status, COUNT(*) FROM users GROUP BY status",
      columns: [],
    });
    expect(result.enabled).toBe(false);
  });
});
