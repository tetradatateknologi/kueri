#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "$ROOT/VERSION")"
ARTIFACT_DIR="${1:-}"
NOTES_URL="${2:-}"

if [[ -z "$ARTIFACT_DIR" || ! -d "$ARTIFACT_DIR" ]]; then
  echo "Usage: $0 <artifact-dir> [notes-url]" >&2
  exit 1
fi

python3 "$ROOT/scripts/gen-release-manifest.py" \
  "$ARTIFACT_DIR" \
  --version "$VERSION" \
  ${NOTES_URL:+--notes-url "$NOTES_URL"}
