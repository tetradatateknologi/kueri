import { describe, expect, it } from "vitest";

import { DEFAULT_QUERY_LIMIT } from "@/lib/api/query-config";
import {
  hasExplicitLimit,
  isReadQuery,
  nextQueryOffset,
  shouldAutoLimit,
} from "@/lib/sql-query";

describe("isReadQuery", () => {
  it("detects uppercase SELECT", () => {
    expect(isReadQuery("SELECT * FROM users")).toBe(true);
  });

  it("detects lowercase select", () => {
    expect(isReadQuery("select * from users")).toBe(true);
  });

  it("detects multiline SELECT", () => {
    expect(isReadQuery("SELECT *\nFROM users")).toBe(true);
  });

  it("detects SELECT with trailing semicolon", () => {
    expect(isReadQuery("SELECT * FROM users;")).toBe(true);
  });

  it("detects WITH CTE SELECT", () => {
    expect(isReadQuery("WITH cte AS (SELECT 1) SELECT * FROM cte")).toBe(true);
  });

  it("does not treat INSERT as read query", () => {
    expect(isReadQuery("INSERT INTO users (name) VALUES ('a')")).toBe(false);
  });

  it("does not treat UPDATE as read query", () => {
    expect(isReadQuery("UPDATE users SET name = 'a'")).toBe(false);
  });

  it("does not treat DELETE as read query", () => {
    expect(isReadQuery("DELETE FROM users")).toBe(false);
  });
});

describe("hasExplicitLimit", () => {
  it("returns false when query has no LIMIT", () => {
    expect(hasExplicitLimit("SELECT * FROM users")).toBe(false);
  });

  it("returns true when query has explicit LIMIT", () => {
    expect(hasExplicitLimit("SELECT * FROM users LIMIT 50")).toBe(true);
  });

  it("ignores LIMIT inside comments", () => {
    expect(hasExplicitLimit("SELECT * FROM users -- LIMIT 99")).toBe(false);
  });

  it("ignores LIMIT inside string literals", () => {
    expect(hasExplicitLimit("SELECT 'LIMIT 99' AS label FROM users")).toBe(false);
  });
});

describe("shouldAutoLimit", () => {
  it("applies default limit for SELECT without LIMIT", () => {
    expect(shouldAutoLimit("SELECT * FROM users")).toBe(true);
  });

  it("does not apply default limit when LIMIT is explicit", () => {
    expect(shouldAutoLimit("SELECT * FROM users LIMIT 50")).toBe(false);
  });

  it("does not apply default limit for mutations", () => {
    expect(shouldAutoLimit("DELETE FROM users")).toBe(false);
  });
});

describe("nextQueryOffset", () => {
  it("uses loaded row count as next offset", () => {
    expect(nextQueryOffset(20)).toBe(20);
    expect(nextQueryOffset(40)).toBe(40);
  });

  it("uses default batch limit constant", () => {
    expect(DEFAULT_QUERY_LIMIT).toBe(20);
  });
});
