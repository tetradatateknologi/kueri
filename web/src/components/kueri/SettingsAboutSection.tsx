import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, RefreshCw } from "lucide-react";

import { KueriLogo } from "@/components/kueri/KueriLogo";
import { checkForUpdates } from "@/lib/api/updates";
import { fetchVersion } from "@/lib/api/version";
import { appVersion, isDesktopBuild } from "@/lib/app-meta";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function SettingsAboutSection() {
  const versionQuery = useQuery({
    queryKey: ["version"],
    queryFn: fetchVersion,
    staleTime: 60_000,
  });

  const updateCheck = useMutation({
    mutationFn: checkForUpdates,
  });

  const runtimeVersion = versionQuery.data?.version ?? appVersion;
  const mode = versionQuery.data?.mode ?? (isDesktopBuild ? "desktop" : "server");
  const update = updateCheck.data;

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-start gap-4">
        <KueriLogo size="md" showWordmark={false} />
        <div>
          <h2 className="text-lg font-semibold">About Kueri</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Application version info and desktop updates.
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-surface-1/30 p-4 space-y-3">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">UI version</dt>
          <dd className="font-mono">{appVersion}</dd>
          <dt className="text-muted-foreground">Runtime version</dt>
          <dd className="font-mono">{runtimeVersion}</dd>
          <dt className="text-muted-foreground">Mode</dt>
          <dd className="capitalize">{mode}</dd>
          {versionQuery.data?.schema_version != null && (
            <>
              <dt className="text-muted-foreground">DB schema</dt>
              <dd className="font-mono">v{versionQuery.data.schema_version}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-surface-1/30 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Updates</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "desktop"
              ? "Check GitHub Releases for the latest build. Download the new installer and restart the app — database migrations run automatically on startup."
              : "Server/web mode: deploy backend and frontend updates separately."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={updateCheck.isPending}
            onClick={() => updateCheck.mutate()}
          >
            <RefreshCw className={cn("size-3.5", updateCheck.isPending && "animate-spin")} />
            Check for updates
          </Button>
          <Button type="button" variant="ghost" size="sm" asChild>
            <a
              href="https://github.com/tetradatateknologi/kueri/releases"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="size-3.5" />
              GitHub Releases
            </a>
          </Button>
        </div>

        {updateCheck.isError && (
          <p className="text-sm text-destructive">
            Could not check for updates. Make sure you have an internet connection.
          </p>
        )}

        {update && (
          <div
            className={cn(
              "rounded-md border p-3 text-sm space-y-2",
              update.update_available
                ? "border-electric/40 bg-electric/5"
                : "border-border bg-background/40",
            )}
          >
            {update.update_available ? (
              <>
                <p>
                  Version <span className="font-mono">{update.latest_version}</span> is available
                  {update.force_update ? " (update required)" : ""}.
                </p>
                {update.size ? (
                  <p className="text-muted-foreground">Download size: {formatBytes(update.size)}</p>
                ) : null}
                {update.download_url ? (
                  <Button type="button" size="sm" asChild>
                    <a href={update.download_url} target="_blank" rel="noreferrer">
                      <Download className="size-3.5" />
                      Download update
                    </a>
                  </Button>
                ) : null}
              </>
            ) : (
              <p>You are on the latest version ({update.current_version}).</p>
            )}
            {update.release_notes_url ? (
              <a
                href={update.release_notes_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-electric hover:underline"
              >
                Release notes
                <ExternalLink className="size-3" />
              </a>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
