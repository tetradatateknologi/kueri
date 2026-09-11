import { describe, expect, it } from "vitest";

import { DEFAULT_QUERY_LIMIT } from "@/lib/api/query-config";
import {
  getStatementAtCursor,
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

describe("getStatementAtCursor", () => {
  const twoStatements =
    "select distinct type from employee_dropdown_options;\n\nselect * from employee_dropdown_options\nwhere type = 'Eselon';";

  it("returns the first statement when cursor is inside it", () => {
    expect(getStatementAtCursor(twoStatements, 10)).toBe(
      "select distinct type from employee_dropdown_options",
    );
  });

  it("returns the second statement when cursor is inside it", () => {
    const cursor = twoStatements.indexOf("where");
    expect(getStatementAtCursor(twoStatements, cursor)).toBe(
      "select * from employee_dropdown_options\nwhere type = 'Eselon'",
    );
  });

  it("resolves cursor in blank space right after a semicolon to the following statement", () => {
    const cursor = twoStatements.indexOf("\n\n") + 1;
    expect(getStatementAtCursor(twoStatements, cursor)).toBe(
      "select * from employee_dropdown_options\nwhere type = 'Eselon'",
    );
  });

  it("ignores semicolons inside string literals", () => {
    const sql = "select * from t where type = 'A;B'";
    expect(getStatementAtCursor(sql, 5)).toBe(sql);
  });

  it("ignores semicolons inside comments", () => {
    const sql = "select * from t -- comment; with semicolon\nwhere id = 1";
    expect(getStatementAtCursor(sql, 5)).toBe(sql);
  });

  it("returns whole trimmed text for a single statement with no semicolon", () => {
    expect(getStatementAtCursor("SELECT * FROM users", 3)).toBe("SELECT * FROM users");
  });

  it("returns whole trimmed statement for a single statement with a trailing semicolon", () => {
    expect(getStatementAtCursor("SELECT * FROM users;", 3)).toBe("SELECT * FROM users");
  });

  it("handles cursor at the very start of the document", () => {
    expect(getStatementAtCursor(twoStatements, 0)).toBe(
      "select distinct type from employee_dropdown_options",
    );
  });

  it("handles cursor at the very end of the document", () => {
    expect(getStatementAtCursor(twoStatements, twoStatements.length)).toBe(
      "select * from employee_dropdown_options\nwhere type = 'Eselon'",
    );
  });

  it("handles empty statements between consecutive semicolons", () => {
    const sql = "SELECT 1;;SELECT 2;";
    const cursor = sql.indexOf(";;") + 2;
    expect(getStatementAtCursor(sql, cursor)).toBe("SELECT 1");
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
