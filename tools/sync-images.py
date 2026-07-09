#!/usr/bin/env python3
"""
Sync images.json for every album folder under Dalia-WebP.

Scans each subfolder, lists all .webp files except cover.webp,
sorts them naturally (001, 002, ...), and writes images.json.

Usage (from project root):
  python tools/sync-images.py
  python tools/sync-images.py --check   # verify only, no writes
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ALBUMS_BASE = ROOT / "Dalia-WebP"


def natural_key(name: str):
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", name)]


def list_images(folder: Path) -> list[str]:
    files = [
        p.name
        for p in folder.iterdir()
        if p.is_file() and p.suffix.lower() == ".webp" and p.name != "cover.webp"
    ]
    return sorted(files, key=natural_key)


def sync_folder(folder: Path, check_only: bool) -> tuple[bool, str]:
    images = list_images(folder)
    json_path = folder / "images.json"

    if json_path.exists():
        try:
            current = json.loads(json_path.read_text(encoding="utf-8"))
            if not isinstance(current, list):
                return False, f"{folder.name}: images.json is not an array"
        except json.JSONDecodeError as exc:
            return False, f"{folder.name}: invalid JSON — {exc}"
    else:
        current = None

    if current == images:
        return True, f"{folder.name}: OK ({len(images)} images)"

    if check_only:
        return False, f"{folder.name}: OUT OF SYNC (json={len(current or [])}, disk={len(images)})"

    json_path.write_text(
        json.dumps(images, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return True, f"{folder.name}: updated ({len(images)} images)"


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync album images.json files")
    parser.add_argument("--check", action="store_true", help="Verify without writing")
    args = parser.parse_args()

    if not ALBUMS_BASE.is_dir():
        print(f"Album folder not found: {ALBUMS_BASE}", file=sys.stderr)
        return 1

    folders = sorted([p for p in ALBUMS_BASE.iterdir() if p.is_dir()], key=lambda p: p.name.lower())
    if not folders:
        print("No album folders found.", file=sys.stderr)
        return 1

    ok = True
    for folder in folders:
        success, message = sync_folder(folder, args.check)
        print(message)
        ok = ok and success

    covers = sum(1 for f in folders if (f / "cover.webp").is_file())
    total = sum(len(list_images(f)) for f in folders)
    print(f"\nAlbums: {len(folders)} | Covers: {covers}/{len(folders)} | Photos: {total}")
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
