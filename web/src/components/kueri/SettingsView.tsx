import { ArrowLeft, BookOpen, DatabaseBackup, Heart, Info, Keyboard } from "lucide-react";

import { KeyboardShortcutsGuide } from "@/components/kueri/KeyboardShortcutsGuide";
import { SettingsAboutSection } from "@/components/kueri/SettingsAboutSection";
import { SettingsBackupSection } from "@/components/kueri/SettingsBackupSection";
import { SettingsContributeSection } from "@/components/kueri/SettingsContributeSection";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAppView, type SettingsSection } from "@/context/app-view";
import { USAGE_GUIDE_SECTIONS } from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";

const NAV: { id: SettingsSection; label: string; icon: typeof BookOpen }[] = [
  { id: "guide", label: "Guide", icon: BookOpen },
  { id: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard },
  { id: "backup", label: "Data backup", icon: DatabaseBackup },
  { id: "about", label: "About & updates", icon: Info },
  { id: "contribute", label: "Support & contribute", icon: Heart },
];

export function SettingsView() {
  const { settingsSection, openWorkspace, openSettings } = useAppView();

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 bg-background">
      <header className="h-12 shrink-0 border-b border-border flex items-center gap-2 px-3 bg-sidebar">
        <SidebarTrigger className="size-8" />
        <h1 className="text-sm font-semibold tracking-tight">Settings</h1>
        <button
          type="button"
          onClick={openWorkspace}
          className="ml-auto flex items-center gap-1.5 h-8 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-surface-1 transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to editor
        </button>
      </header>

      <div className="flex flex-1 min-h-0 min-w-0 w-full">
        <nav
          className="w-52 shrink-0 border-r border-border p-3 space-y-1 bg-surface-1/20"
          aria-label="Settings sections"
        >
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => openSettings(id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-left transition-colors",
                settingsSection === id
                  ? "bg-surface-1 text-foreground ring-1 ring-electric/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-1/60",
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <main className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto p-6">
          {settingsSection === "guide" && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold">Kueri guide</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Overview of the SQL editor and main application features.
                </p>
              </div>
              {USAGE_GUIDE_SECTIONS.map((section) => (
                <section key={section.id} id={`guide-${section.id}`}>
                  <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
                    {section.body.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {settingsSection === "shortcuts" && (
            <div className="space-y-4" id="settings-shortcuts">
              <div>
                <h2 className="text-lg font-semibold">Keyboard shortcuts</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Full shortcut list for the workspace. On Mac use ⌘; on Windows/Linux use Ctrl.
                </p>
              </div>
              <KeyboardShortcutsGuide />
            </div>
          )}

          {settingsSection === "contribute" && <SettingsContributeSection />}

          {settingsSection === "backup" && <SettingsBackupSection />}

          {settingsSection === "about" && <SettingsAboutSection />}
        </main>
      </div>
    </div>
  );
}
