import { describe, expect, it } from "vitest";

import { getSqlCompletionContext } from "./context";

function ctx(sql: string, cursorOffset = sql.length) {
  return getSqlCompletionContext({ sql, cursorOffset });
}

describe("getSqlCompletionContext", () => {
  it("detects table completion after FROM", () => {
    expect(ctx("SELECT * FROM us")).toEqual({ type: "table", prefix: "us" });
  });

  it("detects table completion after JOIN", () => {
    expect(ctx("SELECT * FROM users u JOIN kit")).toEqual({ type: "table", prefix: "kit" });
  });

  it("detects column completion after WHERE", () => {
    expect(ctx("SELECT * FROM users WHERE em")).toEqual({ type: "column", prefix: "em" });
  });

  it("detects alias column completion after u.", () => {
    expect(ctx("SELECT * FROM users u WHERE u.")).toEqual({
      type: "column",
      prefix: "",
      tableOrAlias: "u",
    });
  });

  it("detects schema-qualified table completion", () => {
    expect(ctx("SELECT * FROM public.")).toEqual({
      type: "table",
      prefix: "",
      schemaPrefix: "public",
    });
  });

  it("returns none inside single-quoted string literals", () => {
    expect(ctx("SELECT 'FROM users", 14)).toEqual({ type: "none" });
  });

  it("returns none inside line comments", () => {
    expect(ctx("SELECT -- FROM users", 17)).toEqual({ type: "none" });
  });

  it("returns none inside block comments", () => {
    expect(ctx("SELECT /* FROM users", 18)).toEqual({ type: "none" });
  });

  it("detects column completion in SELECT list", () => {
    const sql = "SELECT na\nFROM users";
    expect(getSqlCompletionContext({ sql, cursorOffset: "SELECT na".length })).toEqual({
      type: "column",
      prefix: "na",
    });
  });
});
