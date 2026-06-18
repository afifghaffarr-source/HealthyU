#!/usr/bin/env python3
"""
HealthyU recipe image generator.

Calls VexoAPI /api/ai/editimg to generate a 1024x1024 PNG from a base photo
template, transformed via prompt. Saves to public/images/recipes/{slug}.png.

Source strategy: picsum.photos (free, deterministic per seed slug, no API key).
AI receives the source image + a prompt describing the Indonesian recipe;
it returns a stylized food-photography version.

Performance:
- ~45-50s per image at 1024x1024 (free-tier upstream)
- ~1.9MB PNG output (will be Cloudflare-cached / CDN-served)
- Idempotent: existing files are overwritten only with --force

Env:
- VEXO_API_KEY from ~/.config/healthyu/production.env

Usage:
  python3 scripts/gen_recipe_image.py --slug gado-gado --title "Gado-Gado" \
      --description "Sayuran rebus dengan saus kacang" --dry-run

  python3 scripts/gen_recipe_image.py --slug gado-gado --title "Gado-Gado" \
      --description "Sayuran rebus dengan saus kacang"

Why this is a separate script (not merged into seed_recipes.py):
- Image gen takes ~45s/image, so seed cron stays fast by default
- Re-runnable: if an image fails, you can retry just that slug
- Independent failure isolation: image gen failure doesn't roll back DB insert
"""
import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import quote


def load_api_key():
    """Load VEXO_API_KEY from ~/.config/healthyu/production.env."""
    env_file = Path.home() / ".config" / "healthyu" / "production.env"
    if not env_file.exists():
        raise SystemExit(f"ERROR: {env_file} not found")
    for line in env_file.read_text().splitlines():
        if line.startswith("VEXO_API_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("ERROR: VEXO_API_KEY not in production.env")


def gen_recipe_image(slug, title, description, api_key, max_retries=1):
    """
    Generate one recipe image via VexoAPI editimg.
    Returns saved path (str) on success, None on failure.

    The endpoint:
      GET https://vexoapi.site/api/ai/editimg?url=<source>&prompt=<txt>&key=<KEY>
    Returns binary PNG bytes (1-2 MB).
    """
    # picsum.photos: deterministic per-seed random photo. Free, no auth.
    # Using slug as seed means re-runs are stable.
    source_url = f"https://picsum.photos/seed/{slug}/800/600"

    # Prompt describes the target dish in food-photography style
    desc_trim = (description or "").strip()[:240]
    prompt = (
        f"Transform into a beautiful top-down food photograph of Indonesian {title}. "
        f"{desc_trim}. "
        f"Rustic wooden table, warm natural daylight, shallow depth of field, "
        f"shot on 50mm lens, appetizing colors, magazine quality."
    )

    url = (
        f"https://vexoapi.site/api/ai/editimg"
        f"?url={quote(source_url, safe='')}"
        f"&prompt={quote(prompt, safe='')}"
        f"&key={quote(api_key, safe='')}"
    )

    for attempt in range(max_retries + 1):
        try:
            tmp_path = f"/tmp/genimg-{slug}-{attempt}.png"
            r = subprocess.run(
                ['curl', '-s', '-X', 'GET', url,
                 '-o', tmp_path,
                 '-w', '\nHTTP_CODE:%{http_code}\nSIZE:%{size_download}\n',
                 '--max-time', '180'],
                capture_output=True, text=True, timeout=200
            )
            stderr_lines = r.stderr.strip() if r.stderr else ""
            stdout_lines = r.stdout.strip() if r.stdout else ""

            # Parse curl -w output (last 2 lines)
            http_code = None
            size = None
            for line in stdout_lines.splitlines():
                if line.startswith("HTTP_CODE:"):
                    try: http_code = int(line.split(":", 1)[1])
                    except: pass
                elif line.startswith("SIZE:"):
                    try: size = int(line.split(":", 1)[1])
                    except: pass

            # Check if it's a real PNG (starts with PNG magic bytes)
            if os.path.exists(tmp_path):
                with open(tmp_path, 'rb') as f:
                    head = f.read(8)
                is_png = head[:4] == b'\x89PNG'
                file_size = os.path.getsize(tmp_path)
            else:
                is_png = False
                file_size = 0

            if is_png and file_size > 50000:  # >50KB = real image
                # Move to public/images/recipes/
                dest = Path(f"public/images/recipes/{slug}.png")
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(open(tmp_path, 'rb').read())
                # Cleanup tmp
                os.unlink(tmp_path)
                return str(dest)
            else:
                # Check for JSON error in tmp file
                err_msg = ""
                if os.path.exists(tmp_path):
                    try:
                        with open(tmp_path, 'r') as f:
                            err_data = json.loads(f.read())
                        err_msg = err_data.get('error', str(err_data))
                    except (json.JSONDecodeError, ValueError):
                        err_msg = f"not a PNG (size={file_size}, http={http_code})"
                    finally:
                        os.unlink(tmp_path)
                else:
                    err_msg = "no response"

                # Retry on 503/maintenance
                if http_code == 503 or 'maintenance' in err_msg.lower():
                    if attempt < max_retries:
                        wait = 30 * (attempt + 1)
                        print(f"    ⚠️  VexoAPI maintenance, retry in {wait}s ({attempt+1}/{max_retries})")
                        time.sleep(wait)
                        continue
                raise RuntimeError(f"VexoAPI editimg failed (http={http_code}): {err_msg}")

        except subprocess.TimeoutExpired:
            if attempt < max_retries:
                print(f"    ⚠️  timeout, retry {attempt+1}/{max_retries}")
                time.sleep(10)
                continue
            return None
        except RuntimeError:
            raise
        except Exception as e:
            print(f"    ⚠️  unexpected: {e}")
            return None
    return None


def main():
    ap = argparse.ArgumentParser(description="Generate recipe hero image via VexoAPI")
    ap.add_argument("--slug", required=True, help="Recipe slug (filename without ext)")
    ap.add_argument("--title", required=True, help="Recipe title for prompt")
    ap.add_argument("--description", default="", help="Recipe description for prompt")
    ap.add_argument("--dry-run", action="store_true", help="Show prompt + curl without running")
    ap.add_argument("--force", action="store_true", help="Overwrite existing image")
    args = ap.parse_args()

    dest = Path(f"public/images/recipes/{args.slug}.png")
    if dest.exists() and not args.force:
        print(f"SKIP: {dest} already exists (use --force to overwrite)")
        sys.exit(0)

    if args.dry_run:
        source_url = f"https://picsum.photos/seed/{args.slug}/800/600"
        prompt = f"Transform into Indonesian {args.title}. {args.description[:200]}..."
        print(f"=== DRY RUN ===")
        print(f"Source URL: {source_url}")
        print(f"Prompt:     {prompt}")
        print(f"Target:     {dest}")
        print(f"Time est:   ~45s")
        sys.exit(0)

    api_key = load_api_key()
    print(f"Generating image for '{args.title}' (slug={args.slug})...")
    t0 = time.time()
    saved = gen_recipe_image(args.slug, args.title, args.description, api_key)
    elapsed = time.time() - t0

    if saved:
        size_kb = os.path.getsize(saved) / 1024
        print(f"✓ Saved {saved} ({size_kb:.0f} KB) in {elapsed:.1f}s")
    else:
        print(f"✗ FAILED after {elapsed:.1f}s")
        sys.exit(1)


if __name__ == "__main__":
    main()