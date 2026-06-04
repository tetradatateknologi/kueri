import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch, executeQuery } from "./http";

describe("apiFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns data envelope on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: "ok" } }),
      }),
    );

    const data = await apiFetch<{ status: string }>("/health");
    expect(data.status).toBe("ok");
  });

  it("throws ApiError on error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          error: { code: "QUERY_ERROR", message: "query failed" },
        }),
      }),
    );

    await expect(executeQuery({ sql: "invalid", env: "development" })).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
