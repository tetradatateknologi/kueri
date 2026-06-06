import { Monitor, Moon, Sun } from "lucide-react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/context/theme";
import { cn } from "@/lib/utils";
import type { ThemeMode } from "@/lib/theme";

const THEME_OPTIONS: {
  value: ThemeMode;
  label: string;
  description: string;
  icon: typeof Moon;
}[] = [
  {
    value: "dark",
    label: "Dark",
    description: "Dark background with light text.",
    icon: Moon,
  },
  {
    value: "light",
    label: "Light",
    description: "Light background with dark text.",
    icon: Sun,
  },
  {
    value: "system",
    label: "System",
    description: "Follow your device appearance setting.",
    icon: Monitor,
  },
];

export function SettingsAppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8 max-w-2xl" id="settings-appearance">
      <div>
        <h2 className="text-lg font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize how kueri.dev looks on this device.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-surface-1/30 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Theme</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the color theme used across the application.
          </p>
        </div>

        <RadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as ThemeMode)}
          aria-label="Application theme"
          className="space-y-2"
        >
          {THEME_OPTIONS.map(({ value, label, description, icon: Icon }) => (
            <Label
              key={value}
              htmlFor={`theme-${value}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors",
                "hover:bg-surface-1/60",
                theme === value && "border-electric/40 bg-surface-1 ring-1 ring-electric/20",
              )}
            >
              <RadioGroupItem id={`theme-${value}`} value={value} className="mt-0.5" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </section>
    </div>
  );
}
