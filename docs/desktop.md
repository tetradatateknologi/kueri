# Desktop / offline mode

Kueri desktop is a **single Go binary** that bundles:

- Embedded **PostgreSQL 16** (local metadata DB under `~/.kueri/data/pg/`)
- **Auto-migrations** on startup (`golang-migrate` + embedded SQL)
- **Vite production build** embedded in the binary
- **Update check** via `latest.json` on GitHub Releases

Default URL when running: `http://127.0.0.1:8765`

---

## Install (CLI)

Recommended one-line install (macOS and Linux):

```bash
curl -fsSL https://raw.githubusercontent.com/tetradatateknologi/kueri/main/scripts/install.sh | bash
```

Safer alternative — download and review the script first:

```bash
curl -fsSL https://raw.githubusercontent.com/tetradatateknologi/kueri/main/scripts/install.sh -o install.sh
less install.sh
bash install.sh
```

The **install script** is served from the `main` branch. The **binary** is always downloaded from **GitHub Releases** using the release manifest:

```text
https://github.com/tetradatateknologi/kueri/releases/latest/download/latest.json
```

### Supported platforms

| Platform | Manifest key | Release artifact |
|----------|--------------|------------------|
| macOS Intel (x86_64) | `darwin-amd64` | `kueri-desktop-darwin-amd64` |
| macOS Apple Silicon (M1+) | `darwin-arm64` | `kueri-desktop-darwin-arm64` |
| Linux x86_64 | `linux-amd64` | `kueri-desktop-linux-amd64` |

Windows is not supported by the Bash installer. Download `kueri-desktop-windows-amd64.exe` from [GitHub Releases](https://github.com/tetradatateknologi/kueri/releases) manually.

### Install location

| Path | Purpose |
|------|---------|
| `~/.kueri/bin/kueri` | Installed binary (default) |
| `/usr/local/bin/kueri` | Symlink when permissions allow |
| `~/.kueri/` | App data (database, config) |

If symlink creation fails, add to `~/.zshrc` or `~/.bashrc`:

```bash
export PATH="$HOME/.kueri/bin:$PATH"
```

### Installer flags

```bash
bash install.sh --help
bash install.sh --version 1.2.3
bash install.sh --install-dir ~/.local/bin
bash install.sh --no-symlink
```

### Security notes (`curl | bash`)

- The install script is small and auditable — prefer reviewing it before running.
- Binaries are verified with **SHA256** from `latest.json` before installation.
- Nothing downloaded is executed before checksum verification.
- The installer does **not** build from source and does not require Go, Node.js, or npm.

### macOS Gatekeeper

Unsigned binaries may show *"Apple could not verify … is free of malware"*. The installer attempts:

```bash
xattr -d com.apple.quarantine ~/.kueri/bin/kueri
```

If the warning persists, right-click the binary → **Open** → **Open**.

---

## Update

From an installed binary:

```bash
kueri update
```

Or re-run the install script (installs the latest release over the existing binary):

```bash
curl -fsSL https://raw.githubusercontent.com/tetradatateknologi/kueri/main/scripts/install.sh | bash
```

In-app: **Settings → Tentang & pembaruan → Cek pembaruan**

`kueri update` downloads the new binary to a temporary file, verifies SHA256, then replaces `~/.kueri/bin/kueri` atomically. Restart Kueri after updating.

---

## Uninstall

```bash
rm -f ~/.kueri/bin/kueri
sudo rm -f /usr/local/bin/kueri
```

Remove app data (optional — deletes local workspaces and database):

```bash
rm -rf ~/.kueri
```

If you added a PATH line manually, remove it from `~/.zshrc`, `~/.bashrc`, or `~/.bash_profile`.

---

## Manual download (alternative)

| Platform | Artifact |
|----------|----------|
| macOS Apple Silicon (M1+) | `kueri-desktop-darwin-arm64` |
| macOS Intel (x86_64) | `kueri-desktop-darwin-amd64` |
| Linux amd64 | `kueri-desktop-linux-amd64` |
| Windows amd64 | `kueri-desktop-windows-amd64.exe` |

```bash
chmod +x kueri-desktop-darwin-amd64
./kueri-desktop-darwin-amd64
```

On first launch, the desktop app runs migrations and creates a default workspace automatically (no `make seed` required).

---

## Versioning

Single source of truth: [`VERSION`](../VERSION) at repo root (SemVer).

Injected into:

- Go binary via `-ldflags -X .../version.Version=...`
- Web UI via Vite `define` (`__APP_VERSION__`)

Release trigger: push git tag `v0.1.0` → [`.github/workflows/release.yml`](../.github/workflows/release.yml).

---

## Local build

```bash
# From repo root
make desktop-build

# Run (opens browser)
./api/bin/kueri-desktop

# CLI
./api/bin/kueri-desktop --version
./api/bin/kueri-desktop update

# Or without opening browser
KUERI_NO_BROWSER=1 ./api/bin/kueri-desktop
```

Data directory (override with `KUERI_DATA_DIR`):

| OS | Path |
|----|------|
| macOS / Linux | `~/.kueri/` |
| Windows | `%LOCALAPPDATA%\kueri\` |

---

## Release flow (maintainers)

1. Bump **`VERSION`** at repo root (or run `./scripts/bump-version.sh patch`)
2. Commit & push to **`main`**
3. **Release Trigger** workflow (`.github/workflows/release-trigger.yml`) auto-creates tag `vX.Y.Z`
4. **Release** workflow builds per-OS binaries + `latest.json` + GitHub Release
5. Users install or update via `install.sh` or `kueri update`

No manual `git tag` required.

### One-command local release

```bash
./scripts/bump-version.sh patch
git add VERSION api/VERSION web/VERSION web/package.json
git commit -m "chore: release v$(tr -d '[:space:]' < VERSION)"
git push origin main
```

Manifest URL (override): `KUERI_UPDATE_MANIFEST_URL`

---

## CI

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR to `main` | Test + build API & web + validate install script |
| `release-trigger.yml` | Push `VERSION` on `main`, or workflow_dispatch | Auto-create tag `v*` |
| `release.yml` | Tag push `v*` | Desktop binaries + GitHub Release |

Validate install script locally:

```bash
bash scripts/validate-install.sh
```

Generate manifest locally:

```bash
make release-manifest ARTIFACT_DIR=dist/release
```

### Manual test checklist (installer)

- [ ] `bash scripts/install.sh --help`
- [ ] `bash scripts/validate-install.sh`
- [ ] Fresh install on macOS Intel (`darwin-amd64`)
- [ ] Fresh install on macOS Apple Silicon (`darwin-arm64`)
- [ ] Fresh install on Linux x86_64
- [ ] `kueri --version` prints the release version
- [ ] `kueri update` when already on latest prints "already up to date"
- [ ] Re-run `bash install.sh` upgrades an older install
- [ ] SHA256 mismatch aborts install (corrupt download)
- [ ] Unsupported platform shows a clear error

---

## Backup & restore (pindah perangkat)

Settings → **Cadangan data** → ekspor/impor file JSON.

| Isi cadangan | Lokasi |
|--------------|--------|
| Workspaces, koneksi, skrip, tag, favorit | Database (API `/api/v1/backup/*`) |
| Riwayat query, preferensi UI | Browser localStorage (digabung saat ekspor) |

**Mode impor:**
- **Merge** — tambah data baru, lewati duplikat
- **Replace** — hapus semua data lokal lalu ganti dari cadangan

File: `kueri-backup-YYYY-MM-DD.json` (format `kueri-backup` v1). Password koneksi disertakan — simpan file di tempat aman.
