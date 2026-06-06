import { describe, expect, it } from "vitest";

import { getSqlCompletionContext } from "./context";
import { buildSqlCompletions } from "./suggestions";
import type { SqlCompletionSchema } from "./types";
import { MAX_COLUMN_COMPLETIONS, MAX_TABLE_COMPLETIONS } from "./types";

const schema: SqlCompletionSchema = {
  connectionId: 1,
  databaseType: "postgres",
  defaultSchema: "public",
  isLoading: false,
  tables: [
    {
      schema: "public",
      name: "users",
      columns: [
        { name: "id", dataType: "bigint", isPrimaryKey: true },
        { name: "email", dataType: "varchar(255)" },
        { name: "username", dataType: "varchar(100)" },
      ],
    },
    {
      schema: "public",
      name: "user_roles",
      columns: [{ name: "id", dataType: "bigint" }],
    },
    {
      schema: "public",
      name: "kitchens",
      columns: [
        { name: "id", dataType: "bigint" },
        { name: "name", dataType: "varchar(100)" },
        { name: "is_active", dataType: "boolean" },
      ],
    },
    {
      schema: "public",
      name: "kitchen_staff",
      columns: [{ name: "kitchen_id", dataType: "bigint", isForeignKey: true }],
    },
  ],
};

function complete(sql: string) {
  const cursorOffset = sql.length;
  const context = getSqlCompletionContext({ sql, cursorOffset });
  return buildSqlCompletions({ schema, sql, cursorOffset, context });
}

describe("buildSqlCompletions", () => {
  it("shows table suggestions from active connection metadata", () => {
    const results = complete("SELECT * FROM us");
    const labels = results.map((r) => r.label);
    expect(labels).toContain("users");
    expect(labels).toContain("user_roles");
    expect(results[0]?.detail).toBe("Table");
  });

  it("shows column suggestions from a single referenced table", () => {
    const sql = "SELECT \nFROM users\nWHERE em";
    const results = buildSqlCompletions({
      schema,
      sql,
      cursorOffset: sql.length,
      context: getSqlCompletionContext({ sql, cursorOffset: sql.length }),
    });
    expect(results.map((r) => r.label)).toContain("email");
    expect(results.find((r) => r.label === "email")?.detail).toContain("varchar(255)");
  });

  it("shows alias-specific column suggestions", () => {
    const sql = "SELECT * FROM users u WHERE u.";
    const results = buildSqlCompletions({
      schema,
      sql,
      cursorOffset: sql.length,
      context: getSqlCompletionContext({ sql, cursorOffset: sql.length }),
    });
    const labels = results.map((r) => r.label);
    expect(labels).toContain("email");
    expect(labels).not.toContain("kitchen_id");
  });

  it("shows join alias column suggestions", () => {
    const sql =
      "SELECT * FROM kitchen_staff ks JOIN kitchens k ON ks.kitchen_id = k.";
    const results = buildSqlCompletions({
      schema,
      sql,
      cursorOffset: sql.length,
      context: getSqlCompletionContext({ sql, cursorOffset: sql.length }),
    });
    expect(results.map((r) => r.label)).toEqual(
      expect.arrayContaining(["id", "name", "is_active"]),
    );
  });

  it("does not show old connection metadata after connection switch", () => {
    const otherConnection = { ...schema, connectionId: 2, tables: [] };
    const results = buildSqlCompletions({
      schema: otherConnection,
      sql: "SELECT * FROM us",
      cursorOffset: "SELECT * FROM us".length,
      context: { type: "table", prefix: "us" },
    });
    expect(results).toEqual([]);
  });

  it("does not show completion when no active connection exists", () => {
    const results = buildSqlCompletions({
      schema: null,
      sql: "SELECT * FROM us",
      cursorOffset: "SELECT * FROM us".length,
      context: { type: "table", prefix: "us" },
    });
    expect(results).toEqual([]);
  });

  it("caps large suggestion lists", () => {
    const manyTables = Array.from({ length: MAX_TABLE_COMPLETIONS + 20 }, (_, i) => ({
      schema: "public",
      name: `table_${i}`,
      columns: [],
    }));
    const results = buildSqlCompletions({
      schema: { ...schema, tables: manyTables },
      sql: "SELECT * FROM ",
      cursorOffset: "SELECT * FROM ".length,
      context: { type: "table", prefix: "" },
    });
    expect(results.length).toBeLessThanOrEqual(MAX_TABLE_COMPLETIONS);

    const manyColumns = Array.from({ length: MAX_COLUMN_COMPLETIONS + 20 }, (_, i) => ({
      name: `column_${i}`,
      dataType: "text",
    }));
    const resultsColumns = buildSqlCompletions({
      schema: {
        ...schema,
        tables: [{ schema: "public", name: "wide", columns: manyColumns }],
      },
      sql: "SELECT ",
      cursorOffset: "SELECT ".length,
      context: { type: "column", prefix: "" },
    });
    expect(resultsColumns.length).toBeLessThanOrEqual(MAX_COLUMN_COMPLETIONS);
  });

  it("includes schema/table name in suggestion documentation", () => {
    const results = complete("SELECT * FROM users");
    expect(results.find((r) => r.label === "users")?.info).toBe("public.users");
  });

  it("includes data type in column completion detail", () => {
    const sql = "SELECT * FROM users u WHERE u.";
    const results = buildSqlCompletions({
      schema,
      sql,
      cursorOffset: sql.length,
      context: getSqlCompletionContext({ sql, cursorOffset: sql.length }),
    });
    const id = results.find((r) => r.label === "id");
    expect(id?.detail).toContain("bigint");
    expect(id?.detail).toContain("PK");
  });
});
