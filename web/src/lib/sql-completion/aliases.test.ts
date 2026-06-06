import { describe, expect, it } from "vitest";

import { extractSimpleTableAliases } from "./aliases";

describe("extractSimpleTableAliases", () => {
  it("extracts alias from FROM users u", () => {
    expect(extractSimpleTableAliases("SELECT * FROM users u")).toEqual({
      users: { schema: undefined, table: "users" },
      u: { schema: undefined, table: "users" },
    });
  });

  it("extracts alias from FROM users AS u", () => {
    expect(extractSimpleTableAliases("SELECT * FROM users AS u")).toEqual({
      users: { schema: undefined, table: "users" },
      u: { schema: undefined, table: "users" },
    });
  });

  it("extracts alias from JOIN kitchens k", () => {
    expect(extractSimpleTableAliases("FROM kitchen_staff ks JOIN kitchens k")).toEqual({
      kitchen_staff: { schema: undefined, table: "kitchen_staff" },
      ks: { schema: undefined, table: "kitchen_staff" },
      kitchens: { schema: undefined, table: "kitchens" },
      k: { schema: undefined, table: "kitchens" },
    });
  });

  it("extracts alias from JOIN kitchens AS k", () => {
    expect(extractSimpleTableAliases("FROM users u JOIN kitchens AS k")).toEqual({
      users: { schema: undefined, table: "users" },
      u: { schema: undefined, table: "users" },
      kitchens: { schema: undefined, table: "kitchens" },
      k: { schema: undefined, table: "kitchens" },
    });
  });

  it("resolves schema-qualified table alias", () => {
    expect(extractSimpleTableAliases("SELECT * FROM public.users u")).toEqual({
      users: { schema: "public", table: "users" },
      u: { schema: "public", table: "users" },
    });
  });
});
