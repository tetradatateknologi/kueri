---
name: kueri-release
description: >-
  Automate kueri desktop releases by bumping VERSION, pushing to main, and
  letting GitHub Actions create the tag and publish GitHub Release artifacts.
  Use when the user asks to release, publish, ship, tag, or bump version for kueri.
---

# Kueri Release

Fully automated release — **no manual `git tag`**.

```
bump VERSION → push main → Release Trigger workflow → tag vX.Y.Z → Release workflow → GitHub Release
```

## Quick release (preferred)

Ask the user for bump type if unclear: `patch` | `minor` | `major`.

```bash
# 1. Ensure CI would pass (optional but recommended)
cd api && go test ./...
cd ../web && npm run test

# 2. Bump version (syncs VERSION, api/VERSION, web/VERSION, web/package.json)
./scripts/bump-version.sh patch   # or minor / major

# 3. Commit & push to main
git add VERSION api/VERSION web/VERSION web/package.json
git commit -m "chore: release v$(tr -d '[:space:]' < VERSION)"
git push origin main
```

GitHub Actions **Release Trigger** (`.github/workflows/release-trigger.yml`) detects the `VERSION` change, creates tag `vX.Y.Z`, then **Release** builds desktop binaries and publishes `latest.json`.

## Monitor

```bash
gh run list --workflow=release-trigger.yml --limit 3
gh run list --workflow=release.yml --limit 3
gh release view --web
```

## Alternative: GitHub UI only (no local bump)

Actions → **Release Trigger** → Run workflow → choose `patch` / `minor` / `major`.

The workflow bumps VERSION, commits to main, creates the tag, and triggers the release build.

## Explicit version

```bash
./scripts/bump-version.py --set 0.2.0
git add VERSION api/VERSION web/VERSION web/package.json
git commit -m "chore: release v0.2.0"
git push origin main
```

## Rules

- **Never** manually `git tag` unless retrying a failed trigger — use `workflow_dispatch` with `bump: none` instead.
- **Never** force-push tags.
- Only release from `main` after CI is green.
- Do not commit secrets or `.env` files.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tag exists, no new release | Bump VERSION again or delete the tag via GitHub UI then re-run Release Trigger |
| Release Trigger skipped | Confirm push changed `VERSION` on `main` |
| Build failed | Fix CI, bump patch, push again |

## Reference

- [docs/desktop.md](../../docs/desktop.md)
- [scripts/bump-version.py](../../scripts/bump-version.py)
- [.github/workflows/release-trigger.yml](../../.github/workflows/release-trigger.yml)
- [.github/workflows/release.yml](../../.github/workflows/release.yml)
