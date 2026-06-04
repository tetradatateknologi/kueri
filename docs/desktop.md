# Desktop / offline mode

Kueri desktop is a **single Go binary** that bundles:

- Embedded **PostgreSQL 16** (local metadata DB under `~/.kueri/data/pg/`)
- **Auto-migrations** on startup (`golang-migrate` + embedded SQL)
- **Vite production build** embedded in the binary
- **Update check** via `latest.json` on GitHub Releases

Default URL when running: `http://127.0.0.1:8765`

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

# Or without opening browser
KUERI_NO_BROWSER=1 ./api/bin/kueri-desktop
```

Data directory (override with `KUERI_DATA_DIR`):

| OS | Path |
|----|------|
| macOS / Linux | `~/.kueri/` |
| Windows | `%LOCALAPPDATA%\kueri\` |

---

## Update flow

1. Maintainer merges to `main`, tags `vX.Y.Z`
2. Release workflow builds per-OS binaries + `latest.json` + `SHA256SUMS`
3. Installed app: **Settings → Tentang & pembaruan → Cek pembaruan**
4. User downloads new installer → restart → DB migrations run automatically

Manifest URL (override): `KUERI_UPDATE_MANIFEST_URL`

---

## CI

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR to `main` | Test + build API & web |
| `release.yml` | Tag `v*` | Desktop binaries + GitHub Release |

Generate manifest locally:

```bash
make release-manifest ARTIFACT_DIR=dist/release
```
