import { ExternalLink, Github, Heart, MessageCircle } from "lucide-react";

import {
  KUERI_GITHUB_ISSUES_URL,
  KUERI_GITHUB_REPO_URL,
} from "@/lib/github";

const linkClass =
  "inline-flex items-center gap-1.5 text-sm text-electric hover:text-electric/80 transition-colors underline-offset-4 hover:underline";

export function SettingsContributeSection() {
  return (
    <div className="space-y-8" id="settings-contribute">
      <div>
        <h2 className="text-lg font-semibold">Support & contribute</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Kueri is an open-source project developed in the open. Report bugs, suggest features, or
          contribute directly on GitHub.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-surface-1/40 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-md bg-gradient-to-br from-electric/20 to-neon/20 flex items-center justify-center shrink-0">
            <Github className="size-5 text-electric" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-semibold">GitHub repository</h3>
            <p className="text-sm text-muted-foreground">
              Source code, documentation, and change history are available from Tetradata Teknologi.
            </p>
            <a
              href={KUERI_GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              tetradatateknologi/kueri
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Heart className="size-4 text-neon" />
          How to help
        </h3>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-foreground font-mono text-xs shrink-0 mt-0.5">★</span>
            <span>Star the repository so more developers can discover the project.</span>
          </li>
          <li className="flex gap-2">
            <MessageCircle className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <span>
              Report bugs or request features via{" "}
              <a
                href={KUERI_GITHUB_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                GitHub Issues
                <ExternalLink className="size-3" />
              </a>
              .
            </span>
          </li>
          <li className="flex gap-2">
            <Github className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
            <span>
              Send pull requests for fixes or new features — follow the guidelines in the repository
              README.
            </span>
          </li>
        </ul>
      </section>

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        Thank you for using Kueri. Your feedback helps make this database workspace better for
        everyone.
      </p>
    </div>
  );
}
