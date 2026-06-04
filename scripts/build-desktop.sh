#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "$ROOT/VERSION")"
WEB_DIST="$ROOT/web/dist"
DESKTOP_DIST="$ROOT/api/internal/desktop/webdist"

echo "==> Building web (desktop mode)"
cd "$ROOT/web"
VITE_DESKTOP_BUILD=1 npm run build

echo "==> Copying web/dist to desktop embed dir"
rm -rf "$DESKTOP_DIST"
mkdir -p "$DESKTOP_DIST"
cp -R "$WEB_DIST/." "$DESKTOP_DIST/"

echo "==> Building desktop binary"
cd "$ROOT/api"
LDFLAGS="-s -w -X github.com/tetradatateknologi/kueri/api/internal/version.Version=${VERSION} -X github.com/tetradatateknologi/kueri/api/internal/version.Mode=desktop"
CGO_ENABLED=0 go build -tags desktop -ldflags "$LDFLAGS" -o bin/kueri-desktop ./cmd/desktop

echo "==> Desktop binary: $ROOT/api/bin/kueri-desktop (v${VERSION})"
