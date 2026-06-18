#!/usr/bin/env python3
"""Backfill hero images for all published recipes.

Calls gen_recipe_image.py per recipe. Skips recipes that already have a non-empty
image file at public/images/recipes/{slug}.png.
"""
import os
import subprocess
import sys
import urllib.request
import json
from pathlib import Path

ROOT = Path("/home/ubuntu/projects/HealthyU")
IMG_DIR = ROOT / "public" / "images" / "recipes"
LOG = Path("/home/ubuntu/backups/healthyu/image-backfill.log")
IMG_DIR.mkdir(parents=True, exist_ok=True)
LOG.parent.mkdir(parents=True, exist_ok=True)

SUP = "https://ohkfcldkuzfcxnpqvdvc.supabase.co"
KEY = Path("/home/ubuntu/.config/healthyu/supabase-secret").read_text().strip()
HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
}


def log(msg: str) -> None:
    print(msg)
    with LOG.open("a") as f:
        f.write(msg + "\n")


def list_recipes() -> list[dict]:
    req = urllib.request.Request(
        f"{SUP}/rest/v1/recipes?select=id,slug,title&is_published=eq.true&order=created_at.asc&limit=200",
        headers=HEADERS,
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def gen_image(slug: str, title: str) -> bool:
    log(f"  GEN  {slug} ({title})")
    r = subprocess.run(
        [
            "python3",
            str(ROOT / "scripts" / "gen_recipe_image.py"),
            "--slug", slug,
            "--title", title,
            "--description", "Resep sehat Indonesia",
        ],
        capture_output=True, text=True, cwd=str(ROOT), timeout=180,
    )
    out = r.stdout + r.stderr
    saved = "Saved" in out
    if saved:
        for line in out.splitlines():
            if "Saved" in line:
                log(f"        {line.strip()}")
    else:
        log(f"        FAILED: {(r.stderr or r.stdout).strip()[:200]}")
    return saved


def main() -> int:
    log(f"=== Backfill started: {os.popen('date -u +%Y-%m-%dT%H:%M:%SZ').read().strip()} ===")
    recipes = list_recipes()
    log(f"Found {len(recipes)} published recipes")

    skipped = 0
    generated = 0
    failed = 0

    for r in recipes:
        slug = r.get("slug")
        title = r.get("title", "")
        if not slug:
            continue
        target = IMG_DIR / f"{slug}.png"
        if target.exists() and target.stat().st_size > 50_000:
            log(f"  SKIP {slug} (file exists, {target.stat().st_size // 1024} KB)")
            skipped += 1
            continue
        if gen_image(slug, title):
            generated += 1
        else:
            failed += 1

    log(f"=== Backfill done: {os.popen('date -u +%Y-%m-%dT%H:%M:%SZ').read().strip()} ===")
    log(f"Summary: generated={generated}, skipped={skipped}, failed={failed}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())