import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchConnectionErd } from "@/lib/api/erd";

describe("fetchConnectionErd", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches ERD metadata from the API envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            connectionId: 5,
            database: "app",
            driver: "postgres",
            schemas: ["public"],
            tables: [],
            relations: [],
          },
        }),
      }),
    );

    const data = await fetchConnectionErd(5);
    expect(data.connectionId).toBe(5);
    expect(data.relations).toEqual([]);
  });
});
