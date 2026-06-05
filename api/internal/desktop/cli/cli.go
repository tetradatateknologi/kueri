package cli

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/tetradatateknologi/kueri/api/internal/modules/update"
	"github.com/tetradatateknologi/kueri/api/internal/version"
)

// Handle exits the process when a CLI subcommand was handled.
func Handle(args []string) bool {
	if len(args) == 0 {
		return false
	}

	switch args[0] {
	case "--version", "-V", "version":
		fmt.Println(version.Version)
		os.Exit(0)
	case "--help", "-h", "help":
		printHelp()
		os.Exit(0)
	case "update":
		runUpdate()
		os.Exit(0)
	default:
		return false
	}

	return false
}

func printHelp() {
	fmt.Println(`Kueri desktop — local database workspace

Usage:
  kueri                 Start the desktop app (opens browser)
  kueri --version       Print installed version
  kueri update          Download and install the latest release
  kueri help            Show this help

Environment:
  KUERI_NO_BROWSER=1           Do not open a browser on startup
  KUERI_UPDATE_MANIFEST_URL    Override release manifest URL

Install / update via script:
  curl -fsSL https://raw.githubusercontent.com/tetradatateknologi/kueri/main/scripts/install.sh | bash`)
}

func runUpdate() {
	opts := update.Options{CurrentVersion: version.Version}
	if manifest := strings.TrimSpace(os.Getenv("KUERI_UPDATE_MANIFEST_URL")); manifest != "" {
		opts.ManifestURL = manifest
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	if err := update.Apply(ctx, opts); err != nil {
		fmt.Fprintf(os.Stderr, "update failed: %v\n", err)
		fmt.Fprintln(os.Stderr, "You can also re-run the install script:")
		fmt.Fprintln(os.Stderr, "  curl -fsSL https://raw.githubusercontent.com/tetradatateknologi/kueri/main/scripts/install.sh | bash")
		os.Exit(1)
	}
}
