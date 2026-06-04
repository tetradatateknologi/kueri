#!/usr/bin/env python3
"""Bump semver in VERSION and sync dependent files."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


def parse_version(raw: str) -> tuple[int, int, int]:
    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", raw.strip())
    if not match:
        raise SystemExit(f"invalid semver: {raw!r}")
    return int(match[1]), int(match[2]), int(match[3])


def bump(version: str, kind: str) -> str:
    major, minor, patch = parse_version(version)
    if kind == "patch":
        patch += 1
    elif kind == "minor":
        minor += 1
        patch = 0
    elif kind == "major":
        major += 1
        minor = 0
        patch = 0
    else:
        raise SystemExit(f"unknown bump kind: {kind}")
    return f"{major}.{minor}.{patch}"


def sync_files(root: Path, version: str) -> None:
    (root / "VERSION").write_text(version + "\n", encoding="utf-8")
    (root / "api" / "VERSION").write_text(version + "\n", encoding="utf-8")
    (root / "web" / "VERSION").write_text(version + "\n", encoding="utf-8")

    package_json = root / "web" / "package.json"
    data = json.loads(package_json.read_text(encoding="utf-8"))
    data["version"] = version
    package_json.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Bump kueri semver version")
    parser.add_argument("kind", choices=["patch", "minor", "major"], nargs="?", default="patch")
    parser.add_argument("--set", dest="explicit", help="Set explicit version instead of bumping")
    parser.add_argument("--print", action="store_true", help="Print resulting version only")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    current = (root / "VERSION").read_text(encoding="utf-8").strip()
    new_version = args.explicit if args.explicit else bump(current, args.kind)
    parse_version(new_version)

    sync_files(root, new_version)

    if args.print:
        print(new_version)
    else:
        print(f"{current} -> {new_version}")


if __name__ == "__main__":
    main()
