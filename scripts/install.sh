#!/usr/bin/env bash
# Install or update Kueri desktop binary from GitHub Releases.
# Usage: curl -fsSL .../install.sh | bash
#        bash install.sh [--version X.Y.Z] [--install-dir DIR] [--no-symlink] [--help]
set -euo pipefail

REPO="tetradatateknologi/kueri"
DEFAULT_MANIFEST_URL="https://github.com/${REPO}/releases/latest/download/latest.json"
DEFAULT_INSTALL_DIR="${HOME}/.kueri/bin"
BINARY_NAME="kueri"
SYMLINK_PATH="/usr/local/bin/${BINARY_NAME}"

VERSION_PIN=""
INSTALL_DIR="${DEFAULT_INSTALL_DIR}"
CREATE_SYMLINK=1
MANIFEST_URL="${DEFAULT_MANIFEST_URL}"

INSTALL_TMPDIR=""

cleanup() {
  if [[ -n "${INSTALL_TMPDIR}" && -d "${INSTALL_TMPDIR}" ]]; then
    rm -rf "${INSTALL_TMPDIR}"
  fi
}
trap cleanup EXIT

log() { printf '%s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die() { printf 'error: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Kueri desktop installer — downloads prebuilt binaries from GitHub Releases.

Usage:
  bash install.sh [options]

Options:
  --version VERSION   Install a specific release (e.g. 1.2.3 or v1.2.3)
  --install-dir DIR   Install directory (default: ~/.kueri/bin)
  --no-symlink        Skip creating /usr/local/bin/kueri symlink
  --help              Show this help

Examples:
  bash install.sh
  bash install.sh --version 1.2.3
  bash install.sh --install-dir ~/.local/bin --no-symlink

Safer install (review script first):
  curl -fsSL https://raw.githubusercontent.com/tetradatateknologi/kueri/main/scripts/install.sh -o install.sh
  less install.sh
  bash install.sh

Update an existing install:
  kueri update
  # or re-run: bash install.sh
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --version)
        [[ $# -ge 2 ]] || die "--version requires a value"
        VERSION_PIN="$2"
        shift 2
        ;;
      --install-dir)
        [[ $# -ge 2 ]] || die "--install-dir requires a value"
        INSTALL_DIR="$2"
        shift 2
        ;;
      --no-symlink)
        CREATE_SYMLINK=0
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        die "unknown option: $1 (try --help)"
        ;;
    esac
  done
}

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || die "required command not found: ${cmd}"
}

detect_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"
  case "$os" in
    Darwin)
      case "$arch" in
        x86_64) echo "darwin-amd64" ;;
        arm64) echo "darwin-arm64" ;;
        *) die "unsupported macOS architecture: ${arch} (supported: x86_64, arm64)" ;;
      esac
      ;;
    Linux)
      case "$arch" in
        x86_64|amd64) echo "linux-amd64" ;;
        *) die "unsupported Linux architecture: ${arch} (supported: x86_64)" ;;
      esac
      ;;
    *)
      die "unsupported operating system: ${os} (supported: macOS, Linux)"
      ;;
  esac
}

manifest_url_for_version() {
  local ver="$1"
  ver="${ver#v}"
  printf 'https://github.com/%s/releases/download/v%s/latest.json' "$REPO" "$ver"
}

sha256_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    die "required command not found: sha256sum or shasum"
  fi
}

parse_manifest_artifact() {
  local manifest="$1"
  local platform="$2"
  python3 - "$manifest" "$platform" <<'PY'
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

download_file() {
  local url="$1"
  local dest="$2"
  curl -fsSL --retry 3 --retry-delay 2 -o "$dest" "$url"
}

install_binary() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  if [[ -f "$dest" ]]; then
    cp -f "$dest" "${dest}.bak" 2>/dev/null || true
  fi
  mv -f "$src" "$dest"
  chmod +x "$dest"
}

remove_quarantine() {
  local path="$1"
  if [[ "$(uname -s)" == "Darwin" ]] && command -v xattr >/dev/null 2>&1; then
    xattr -d com.apple.quarantine "$path" 2>/dev/null || true
  fi
}

create_symlink() {
  local target="$1"
  local link="$2"
  if ln -sf "$target" "$link" 2>/dev/null; then
    log "Symlink created: ${link} -> ${target}"
    return 0
  fi
  if sudo ln -sf "$target" "$link" 2>/dev/null; then
    log "Symlink created (sudo): ${link} -> ${target}"
    return 0
  fi
  return 1
}

print_path_hint() {
  local dir="$1"
  log ""
  log "Add Kueri to your PATH by adding this line to ~/.zshrc or ~/.bashrc:"
  log "  export PATH=\"${dir}:\$PATH\""
  log ""
  log "Then run: source ~/.zshrc  (or open a new terminal)"
}

validate_install() {
  local binary="$1"
  if "$binary" --version >/dev/null 2>&1; then
    log "Installed version: $("$binary" --version)"
    return 0
  fi
  if "$binary" version >/dev/null 2>&1; then
    log "Installed version: $("$binary" version)"
    return 0
  fi
  warn "version check unavailable (--version not supported by this binary)"
  return 0
}

main() {
  parse_args "$@"

  require_cmd curl
  require_cmd uname
  require_cmd python3
  require_cmd mktemp

  if [[ -n "$VERSION_PIN" ]]; then
    MANIFEST_URL="$(manifest_url_for_version "$VERSION_PIN")"
  fi

  local platform
  platform="$(detect_platform)"
  log "Platform: ${platform}"

  INSTALL_TMPDIR="$(mktemp -d)"
  local manifest="${INSTALL_TMPDIR}/latest.json"
  local download="${INSTALL_TMPDIR}/kueri-download"
  local install_path="${INSTALL_DIR%/}/${BINARY_NAME}"

  log "Fetching manifest: ${MANIFEST_URL}"
  download_file "$MANIFEST_URL" "$manifest"

  local release_version url expected_sha size
  {
    IFS= read -r release_version
    IFS= read -r url
    IFS= read -r expected_sha
    IFS= read -r size
  } < <(parse_manifest_artifact "$manifest" "$platform")

  log "Release version: ${release_version}"
  log "Downloading: ${url}"
  download_file "$url" "$download"

  local actual_sha
  actual_sha="$(sha256_file "$download")"
  if [[ "$actual_sha" != "$expected_sha" ]]; then
    die "SHA256 mismatch (expected ${expected_sha}, got ${actual_sha})"
  fi
  log "SHA256 verified (${actual_sha})"

  if [[ -n "$size" && "$size" != "0" ]]; then
    local actual_size
    actual_size="$(wc -c < "$download" | tr -d ' ')"
    if [[ "$actual_size" != "$size" ]]; then
      warn "file size mismatch (expected ${size}, got ${actual_size})"
    fi
  fi

  install_binary "$download" "$install_path"
  remove_quarantine "$install_path"

  log ""
  log "Kueri ${release_version} installed to: ${install_path}"

  if [[ "$CREATE_SYMLINK" -eq 1 ]]; then
    if ! create_symlink "$install_path" "$SYMLINK_PATH"; then
      warn "could not create symlink at ${SYMLINK_PATH}"
      print_path_hint "$INSTALL_DIR"
    fi
  else
    print_path_hint "$INSTALL_DIR"
  fi

  log ""
  validate_install "$install_path"

  log ""
  log "Run Kueri:"
  if [[ -x "$SYMLINK_PATH" ]] || command -v "$BINARY_NAME" >/dev/null 2>&1; then
    log "  ${BINARY_NAME}"
  else
    log "  ${install_path}"
  fi
  log ""
  log "Update later with: ${BINARY_NAME} update"
}

main "$@"
