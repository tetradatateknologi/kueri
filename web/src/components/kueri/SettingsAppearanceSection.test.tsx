import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { SettingsAppearanceSection } from "@/components/kueri/SettingsAppearanceSection";
import { ThemeProvider } from "@/context/theme";
import { THEME_STORAGE_KEY } from "@/lib/theme";

function renderAppearance(initialTheme: "dark" | "light" | "system" = "dark") {
  localStorage.setItem(THEME_STORAGE_KEY, initialTheme);
  document.documentElement.classList.toggle("dark", initialTheme !== "light");

  return render(
    <ThemeProvider>
      <SettingsAppearanceSection />
    </ThemeProvider>,
  );
}

function themeRadio(id: "dark" | "light" | "system") {
  return document.getElementById(`theme-${id}`)!;
}

describe("SettingsAppearanceSection", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "";
  });

  it("renders the appearance page content", () => {
    renderAppearance();

    expect(screen.getByRole("heading", { name: "Appearance" })).toBeInTheDocument();
    expect(
      screen.getByText("Customize how kueri.dev looks on this device."),
    ).toBeInTheDocument();
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(
      screen.getByText("Choose the color theme used across the application."),
    ).toBeInTheDocument();
  });

  it("shows the current selected theme", () => {
    renderAppearance("light");

    expect(themeRadio("light")).toHaveAttribute("aria-checked", "true");
    expect(themeRadio("dark")).toHaveAttribute("aria-checked", "false");
  });

  it("switches from dark to light and persists preference", () => {
    renderAppearance("dark");

    fireEvent.click(themeRadio("light"));

    expect(themeRadio("light")).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("switches from light to dark and persists preference", () => {
    renderAppearance("light");

    fireEvent.click(themeRadio("dark"));

    expect(themeRadio("dark")).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("supports system theme selection", () => {
    renderAppearance("dark");

    fireEvent.click(themeRadio("system"));

    expect(themeRadio("system")).toHaveAttribute("aria-checked", "true");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
  });
});
