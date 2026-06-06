import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsView } from "@/components/kueri/SettingsView";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppUrlProvider } from "@/context/app-url";
import { AppViewProvider } from "@/context/app-view";
import { ThemeProvider } from "@/context/theme";

function renderSettingsView() {
  return render(
    <ThemeProvider>
      <AppUrlProvider>
        <AppViewProvider>
          <SidebarProvider>
            <SettingsView />
          </SidebarProvider>
        </AppViewProvider>
      </AppUrlProvider>
    </ThemeProvider>,
  );
}

describe("SettingsView", () => {
  it("includes Appearance in the settings navigation", () => {
    renderSettingsView();

    expect(screen.getByRole("button", { name: "Appearance" })).toBeInTheDocument();
  });
});
