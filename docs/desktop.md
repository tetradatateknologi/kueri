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

1. Bump **`VERSION`** at repo root (or run `./scripts/bump-version.sh patch`)
2. Commit & push to **`main`**
3. **Release Trigger** workflow (`.github/workflows/release-trigger.yml`) auto-creates tag `vX.Y.Z`
4. **Release** workflow builds per-OS binaries + `latest.json` + GitHub Release
5. Installed app: **Settings → Tentang & pembaruan → Cek pembaruan**

No manual `git tag` required.

### One-command local release

```bash
./scripts/bump-version.sh patch
git add VERSION api/VERSION web/VERSION web/package.json
git commit -m "chore: release v$(tr -d '[:space:]' < VERSION)"
git push origin main
```

### GitHub UI only

Actions → **Release Trigger** → Run workflow → choose `patch` / `minor` / `major`.

### Cursor skill

Project skill: `.cursor/skills/kueri-release/SKILL.md` — ask Cursor to **"release kueri"** or **"bump patch and release"**.

Manifest URL (override): `KUERI_UPDATE_MANIFEST_URL`

---

## CI

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR to `main` | Test + build API & web |
| `release-trigger.yml` | Push `VERSION` on `main`, or workflow_dispatch | Auto-create tag `v*` |
| `release.yml` | Tag push `v*` | Desktop binaries + GitHub Release |

Generate manifest locally:

```bash
make release-manifest ARTIFACT_DIR=dist/release
```
