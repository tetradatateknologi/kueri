import { describe, expect, it } from "vitest";

import { getEditorThemeExtensions } from "@/lib/codemirror-theme";

describe("getEditorThemeExtensions", () => {
  it("returns different theme extensions for dark and light modes", () => {
    const dark = getEditorThemeExtensions("dark");
    const light = getEditorThemeExtensions("light");

    expect(dark).toHaveLength(2);
    expect(light).toHaveLength(2);
    expect(dark).not.toEqual(light);
  });
});
