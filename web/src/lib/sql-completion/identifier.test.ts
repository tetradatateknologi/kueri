import { describe, expect, it } from "vitest";

import { quoteIdentifierIfNeeded } from "./identifier";

describe("quoteIdentifierIfNeeded", () => {
  it("does not quote simple lowercase identifiers", () => {
    expect(quoteIdentifierIfNeeded("users", "postgres")).toBe("users");
    expect(quoteIdentifierIfNeeded("email", "mysql")).toBe("email");
  });

  it("quotes reserved words for postgres", () => {
    expect(quoteIdentifierIfNeeded("user", "postgres")).toBe('"user"');
    expect(quoteIdentifierIfNeeded("order", "postgres")).toBe('"order"');
  });

  it("quotes reserved words for mysql with backticks", () => {
    expect(quoteIdentifierIfNeeded("order", "mysql")).toBe("`order`");
  });

  it("quotes identifiers with spaces", () => {
    expect(quoteIdentifierIfNeeded("full name", "postgres")).toBe('"full name"');
    expect(quoteIdentifierIfNeeded("full name", "mysql")).toBe("`full name`");
  });

  it("quotes uppercase identifiers for postgres", () => {
    expect(quoteIdentifierIfNeeded("UserId", "postgres")).toBe('"UserId"');
  });
});
