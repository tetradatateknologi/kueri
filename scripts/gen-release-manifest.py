#!/usr/bin/env python3
"""Generate latest.json and SHA256SUMS for a Kueri desktop release."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import date
from pathlib import Path


def platform_for(name: str) -> str | None:
    lower = name.lower()
    if "darwin-arm64" in lower or "darwin-universal" in lower:
        return "darwin-arm64"
    if "darwin-amd64" in lower:
        return "darwin-amd64"
    if "windows" in lower or lower.endswith(".exe"):
        return "windows-amd64"
    if "linux" in lower or lower.endswith(".appimage"):
        return "linux-amd64"
    return None


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("artifact_dir", type=Path)
    parser.add_argument("--version", required=True)
    parser.add_argument("--repo", default="tetradatateknologi/kueri")
    parser.add_argument("--notes-url", default="")
    parser.add_argument("--min-supported", default="0.1.0")
    args = parser.parse_args()

    artifact_dir = args.artifact_dir
    if not artifact_dir.is_dir():
        raise SystemExit(f"artifact dir not found: {artifact_dir}")

    version = args.version.lstrip("v")
    tag = f"v{version}"
    notes_url = args.notes_url or f"https://github.com/{args.repo}/releases/tag/{tag}"

    platforms: dict[str, dict[str, object]] = {}
    checksum_lines: list[str] = []

    for path in sorted(artifact_dir.iterdir()):
        if not path.is_file():
            continue
        if path.name in {"latest.json", "SHA256SUMS"}:
            continue
        platform = platform_for(path.name)
        if not platform:
            continue
        digest = sha256_file(path)
        size = path.stat().st_size
        checksum_lines.append(f"{digest}  {path.name}")
        platforms[platform] = {
            "url": f"https://github.com/{args.repo}/releases/download/{tag}/{path.name}",
            "sha256": digest,
            "size": size,
        }

    manifest = {
        "version": version,
        "release_date": date.today().isoformat(),
        "min_supported_version": args.min_supported,
        "notes_url": notes_url,
        "platforms": platforms,
    }

    (artifact_dir / "latest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    (artifact_dir / "SHA256SUMS").write_text("\n".join(checksum_lines) + ("\n" if checksum_lines else ""), encoding="utf-8")
    print(f"Wrote {artifact_dir / 'latest.json'} ({len(platforms)} platforms)")


if __name__ == "__main__":
    main()
