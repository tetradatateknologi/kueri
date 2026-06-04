import { describe, expect, it } from "vitest";

import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION } from "@/lib/backup/types";
import { parseBackupFile } from "@/lib/backup";

describe("parseBackupFile", () => {
  it("accepts valid kueri backup", () => {
    const parsed = parseBackupFile({
      format: BACKUP_FORMAT,
      format_version: BACKUP_FORMAT_VERSION,
      exported_at: "2026-06-04T00:00:00Z",
      user: { name: "Dev", email: "dev@kueri.local" },
      workspaces: [],
    });
    expect(parsed.format).toBe(BACKUP_FORMAT);
  });

  it("rejects unknown format", () => {
    expect(() =>
      parseBackupFile({
        format: "other",
        format_version: 1,
        workspaces: [],
      }),
    ).toThrow(/unrecognized backup format/i);
  });
});
