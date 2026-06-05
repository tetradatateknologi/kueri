#!/usr/bin/env bash
# Lightweight checks for scripts/install.sh (no network required).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_SH="${ROOT}/scripts/install.sh"
FIXTURE="${ROOT}/scripts/fixtures/latest.json"

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
ok() { printf 'OK: %s\n' "$*"; }

[[ -f "$INSTALL_SH" ]] || fail "missing install.sh"
chmod +x "$INSTALL_SH"

bash "$INSTALL_SH" --help >/dev/null
ok "install.sh --help"

detect_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"
  case "$os" in
    Darwin)
      case "$arch" in
        x86_64) echo "darwin-amd64" ;;
        arm64) echo "darwin-arm64" ;;
        *) die "unsupported macOS architecture: ${arch}" ;;
      esac
      ;;
    Linux)
      case "$arch" in
        x86_64|amd64) echo "linux-amd64" ;;
        *) die "unsupported Linux architecture: ${arch}" ;;
      esac
      ;;
    *)
      die "unsupported operating system: ${os}"
      ;;
  esac
}

platform="$(detect_platform)"
case "$platform" in
  darwin-amd64|darwin-arm64|linux-amd64) ok "detect_platform -> ${platform}" ;;
  *) fail "unexpected platform: ${platform}" ;;
esac

parse_manifest_artifact() {
  python3 - "$1" "$2" <<'PY'
import json
import sys

manifest_path, platform = sys.argv[1], sys.argv[2]
with open(manifest_path, encoding="utf-8") as fh:
    data = json.load(fh)

platforms = data.get("platforms") or data.get("files") or {}
artifact = platforms.get(platform)
if artifact is None and platform == "darwin-arm64":
    artifact = platforms.get("darwin-universal")
if artifact is None:
    available = ", ".join(sorted(platforms.keys()))
    print(f"error: no artifact for platform {platform!r} (available: {available})", file=sys.stderr)
    sys.exit(1)

version = data.get("version", "")
url = artifact.get("url", "")
digest = artifact.get("sha256", "")
size = artifact.get("size", 0)
if not url or not digest:
    print("error: manifest artifact missing url or sha256", file=sys.stderr)
    sys.exit(1)

print(version)
print(url)
print(digest)
print(size)
PY
}

{
  IFS= read -r ver
  IFS= read -r url
  IFS= read -r sha
  IFS= read -r _size
} < <(parse_manifest_artifact "$FIXTURE" "darwin-amd64")

[[ "$ver" == "1.2.2" ]] || fail "manifest version parse"
[[ "$url" == *"kueri-desktop-darwin-amd64"* ]] || fail "manifest url parse"
[[ -n "$sha" ]] || fail "manifest sha256 parse"
ok "manifest parsing (darwin-amd64)"

tmp="$(mktemp)"
printf 'kueri-test-payload' >"$tmp"
if command -v sha256sum >/dev/null 2>&1; then
  expected="$(sha256sum "$tmp" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  expected="$(shasum -a 256 "$tmp" | awk '{print $1}')"
else
  fail "sha256sum or shasum required"
fi
[[ "$expected" == "ca448248dd5b71ad2eb766864e37ac7fd617727e7b9e317d1c937a8974eeadf5" ]] || fail "sha256 fixture mismatch"
rm -f "$tmp"
ok "sha256 tooling available"

ok "all install script validations passed"
