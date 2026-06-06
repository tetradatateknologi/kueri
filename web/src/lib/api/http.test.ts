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

  it("sends pagination params for load more requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          columns: ["id"],
          rows: [[2]],
          rowCount: 1,
          durationMs: 1,
          cached: false,
          limit: 20,
          offset: 20,
          hasMore: false,
          autoLimitApplied: true,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await executeQuery({
      sql: "SELECT * FROM users",
      connection_id: 1,
      limit: 20,
      offset: 20,
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      sql: "SELECT * FROM users",
      connection_id: 1,
      limit: 20,
      offset: 20,
    });
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

    await expect(executeQuery({ sql: "invalid", connection_id: 1 })).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});
