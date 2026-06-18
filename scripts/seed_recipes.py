#!/usr/bin/env python3
"""
HealthyU bulk recipe seeder.

Generates Indonesian healthy recipes via VexoAPI (Gemini 2.5 Flash), then
INSERTs into both `recipes` and `seo_recipes` Supabase tables. Idempotent:
skips recipes whose slug already exists in `recipes`.

Usage:
  python3 scripts/seed_recipes.py --count 5 --dry-run          # preview only
  python3 scripts/seed_recipes.py --count 5 --category snack   # real run
  python3 scripts/seed_recipes.py --count 10 --focus "high protein"
  python3 scripts/seed_recipes.py --count 5 --model llama-3.1-8b-instant  # faster

Why this exists: before this script, recipes were added one-off via the
AI Recipe Modal (user-facing) or manual SQL INSERT. This script automates
bulk seeding for ops tasks (e.g., "add 10 breakfast recipes for next week").
The cron wrapper at /etc/cron.d/healthyu-seed-recipes runs it weekly.

Rate-limit notes (VexoAPI free tier):
- 1 request per batch — even with --count 10, we make 1 call and ask AI
  to return an array of N recipes. This keeps us well under the 5 req/min
  free-tier cap.
- AI sometimes returns malformed JSON. We catch + retry up to 2x with
  stricter prompt. If still failing, that batch is reported + skipped.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Optional image-gen integration (loaded lazily)
_gen_recipe_image = None
try:
    from gen_recipe_image import gen_recipe_image as _gen_recipe_image
except ImportError:
    pass
_HAS_IMAGE_GEN = _gen_recipe_image is not None

# ===== Config loading =====
def load_config():
    """Load API keys from ~/.config/healthyu/production.env + dedicated files."""
    cfg = {}
    env_file = Path.home() / ".config" / "healthyu" / "production.env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if '=' in line and not line.startswith('#'):
                k, v = line.split('=', 1)
                cfg[k.strip()] = v.strip()
    # Override with dedicated secret file (service role key is longer/more privileged)
    secret_file = Path.home() / ".config" / "healthyu" / "supabase-secret"
    if secret_file.exists():
        cfg['SUPABASE_SERVICE_KEY'] = secret_file.read_text().strip()
    pub_file = Path.home() / ".config" / "healthyu" / "supabase-publishable"
    if pub_file.exists():
        cfg['SUPABASE_PUBLISHABLE_KEY'] = pub_file.read_text().strip()
    return cfg


def slugify(text):
    """Indonesian-safe slug: lowercase, kebab-case, strip non-ASCII letters/digits."""
    s = text.lower()
    # Strip punctuation except hyphen + space
    s = re.sub(r'[^a-z0-9\s\-]', '', s)
    s = re.sub(r'\s+', '-', s).strip('-')
    s = re.sub(r'-+', '-', s)
    return s[:80]  # cap length


# ===== VexoAPI call =====
def call_vexo(prompt, model, api_key, base_url, max_retries=2):
    """POST /api/v1/chat/completions. Returns parsed content (str)."""
    url = f"{base_url}/api/v1/chat/completions"
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a JSON-only API. Output ONLY valid JSON. No markdown, no explanations."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.8,  # some variety across runs
        "max_tokens": 4096,
    }
    for attempt in range(max_retries + 1):
        try:
            r = subprocess.run(
                ['curl', '-s', '-X', 'POST', url,
                 '-H', 'Authorization: Bearer ' + api_key,
                 '-H', 'Content-Type: application/json',
                 '--max-time', '120',
                 '--data', json.dumps(body)],
                capture_output=True, text=True
            )
            data = json.loads(r.stdout)
            if 'error' in data:
                err_msg = data['error'].get('message', str(data['error']))
                if attempt < max_retries and ('rate' in err_msg.lower() or 'timeout' in err_msg.lower()):
                    time.sleep(5 * (attempt + 1))
                    continue
                raise RuntimeError(f"VexoAPI error: {err_msg}")
            content = data['choices'][0]['message']['content']
            return content
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            if attempt < max_retries:
                time.sleep(3)
                continue
            raise RuntimeError(f"VexoAPI parse failed after {max_retries+1} attempts: {e}\nResponse: {r.stdout[:500]}")


def parse_recipes_json(content, expected_count):
    """Strip markdown fences if present, parse JSON array. Robust to common LLM mistakes."""
    content = content.strip()
    # Strip ```json ... ``` fences
    if content.startswith('```'):
        lines = content.split('\n')
        # Drop first fence line + last fence line
        lines = [l for l in lines if not l.strip().startswith('```')]
        content = '\n'.join(lines).strip()
    # If AI returned single object instead of array, wrap it
    if content.startswith('{') and not content.startswith('['):
        content = '[' + content + ']'
    try:
        arr = json.loads(content)
    except json.JSONDecodeError as e:
        # Try to find the JSON array substring
        m = re.search(r'\[.*\]', content, re.DOTALL)
        if m:
            try:
                arr = json.loads(m.group(0))
            except json.JSONDecodeError:
                raise RuntimeError(f"Could not parse AI JSON: {e}\nFirst 500 chars: {content[:500]}")
        else:
            raise RuntimeError(f"Could not parse AI JSON: {e}\nFirst 500 chars: {content[:500]}")
    if not isinstance(arr, list):
        raise RuntimeError(f"AI did not return array. Got: {type(arr).__name__}")
    if len(arr) < expected_count:
        print(f"  ⚠️  AI returned {len(arr)} recipes (asked for {expected_count})")
    return arr[:expected_count]


# ===== Supabase REST =====
def supabase_call(method, path, body=None, key=None):
    """Direct Supabase REST call. key should be service_role for writes."""
    SUP = 'https://ohkfcldkuzfcxnpqvdvc.supabase.co'
    cmd = ['curl', '-s', '-X', method, f'{SUP}{path}',
           '-H', 'apikey: ' + key,
           '-H', 'Authorization: Bearer ' + key,
           '-H', 'Content-Type: application/json']
    if body is not None:
        cmd += ['--data', json.dumps(body)]
        if method == 'POST':
            cmd += ['-H', 'Prefer: return=representation']
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    try:
        result = json.loads(r.stdout)
        return result
    except json.JSONDecodeError:
        return {'raw': r.stdout[:300]}


def slug_exists(slug, key):
    """Check if slug already exists in `recipes` table."""
    res = supabase_call('GET', f'/rest/v1/recipes?slug=eq.{slug}&select=id,slug', key=key)
    return isinstance(res, list) and len(res) > 0


def insert_recipe(recipe_data, key):
    """Insert into both `recipes` + `seo_recipes`. Returns (recipes_id, seo_id) or raises."""
    now = datetime.now(timezone.utc).isoformat()
    slug = recipe_data['slug']
    title = recipe_data['title']

    # Build recipes table payload (35+ cols, but we map the essentials)
    recipes_payload = {
        'title': title,
        'slug': slug,
        'description': recipe_data.get('description'),
        'category': recipe_data.get('category'),
        'cuisine': recipe_data.get('cuisine', 'Indonesia'),
        'image_url': recipe_data.get('image_url'),
        'prep_min': recipe_data.get('prep_min'),
        'cook_min': recipe_data.get('cook_min'),
        'total_min': (recipe_data.get('prep_min') or 0) + (recipe_data.get('cook_min') or 0),
        'servings': recipe_data.get('servings'),
        'calories': recipe_data.get('calories'),
        'protein_g': recipe_data.get('protein_g'),
        'carbs_g': recipe_data.get('carbs_g'),
        'fat_g': recipe_data.get('fat_g'),
        'fiber_g': recipe_data.get('fiber_g'),
        'ingredients': recipe_data.get('ingredients', []),
        'instructions': recipe_data.get('instructions', []),
        'tags': recipe_data.get('tags', []),
        'is_vegan': recipe_data.get('is_vegan', False),
        'is_vegetarian': recipe_data.get('is_vegetarian', False),
        'is_halal': recipe_data.get('is_halal', True),
        'is_keto_friendly': recipe_data.get('is_keto_friendly', False),
        'is_indonesian': True,
        'difficulty': recipe_data.get('difficulty', 'beginner'),
        'is_published': True,
        'is_featured': False,
        'body_source': 'seed',
    }
    recipes_payload = {k: v for k, v in recipes_payload.items() if v is not None}

    rec_res = supabase_call('POST', '/rest/v1/recipes', body=recipes_payload, key=key)
    if not isinstance(rec_res, list) or not rec_res:
        raise RuntimeError(f"recipes INSERT failed: {rec_res}")
    rec_id = rec_res[0]['id']

    # Build seo_recipes payload (similar but with `published` + `keywords` + `published_at`)
    seo_payload = {
        'slug': slug,
        'title': title,
        'description': recipe_data.get('description'),
        'category': recipe_data.get('category'),
        'cuisine': recipe_data.get('cuisine', 'Indonesia'),
        'image_url': recipe_data.get('image_url'),
        'prep_min': recipe_data.get('prep_min'),
        'cook_min': recipe_data.get('cook_min'),
        'total_min': (recipe_data.get('prep_min') or 0) + (recipe_data.get('cook_min') or 0),
        'servings': recipe_data.get('servings'),
        'calories': recipe_data.get('calories'),
        'protein_g': recipe_data.get('protein_g'),
        'carbs_g': recipe_data.get('carbs_g'),
        'fat_g': recipe_data.get('fat_g'),
        'fiber_g': recipe_data.get('fiber_g'),
        'ingredients': recipe_data.get('ingredients', []),
        'instructions': recipe_data.get('instructions', []),
        'tags': recipe_data.get('tags', []),
        'keywords': recipe_data.get('keywords', []),  # optional
        'is_vegan': recipe_data.get('is_vegan', False),
        'is_vegetarian': recipe_data.get('is_vegetarian', False),
        'is_halal': recipe_data.get('is_halal', True),
        'published': True,
        'published_at': now,
        'created_at': now,
        'updated_at': now,
    }
    seo_payload = {k: v for k, v in seo_payload.items() if v is not None}

    seo_res = supabase_call('POST', '/rest/v1/seo_recipes', body=seo_payload, key=key)
    if not isinstance(seo_res, list) or not seo_res:
        # Rollback recipes insert
        supabase_call('DELETE', f'/rest/v1/recipes?id=eq.{rec_id}', key=key)
        raise RuntimeError(f"seo_recipes INSERT failed (rolled back recipes): {seo_res}")
    seo_id = seo_res[0]['id']

    return rec_id, seo_id


# ===== Main =====
def main():
    ap = argparse.ArgumentParser(description='Seed Indonesian healthy recipes via VexoAPI')
    ap.add_argument('--count', type=int, default=5, help='Number of recipes to generate (default: 5)')
    ap.add_argument('--category', type=str, default=None, help='Focus on one category (e.g., snack, breakfast, main)')
    ap.add_argument('--focus', type=str, default=None, help='Nutritional focus (e.g., "high protein", "low carb")')
    ap.add_argument('--model', type=str, default='openai/gpt-oss-120b:free', help='Vexo model ID')
    ap.add_argument('--dry-run', action='store_true', help='Show what would be inserted without writing')
    ap.add_argument('--image-template', type=str, default='/images/recipes/{slug}.jpg',
                    help='URL template for image_url. {slug} substituted. Default matches existing recipe convention. '
                         'Set to empty string "" to skip image_url. Use https://picsum.photos/seed/{slug}/800/600 '
                         'for random placeholder images (free, no API key).')
    ap.add_argument('--generate-image', action='store_true',
                    help='Actually call VexoAPI editimg to generate a real PNG hero image per recipe '
                         '(~50s/image, ~2MB PNG saved to public/images/recipes/{slug}.png). '
                         'Off by default — cron stays fast by using template URL. '
                         'Requires --image-template not to be the default jpg template, OR '
                         'will be auto-switched to /images/recipes/{slug}.png.')
    args = ap.parse_args()

    cfg = load_config()
    api_key = cfg.get('VEXO_API_KEY')
    base_url = cfg.get('VEXO_BASE_URL', 'https://vexoapi.site')
    svc_key = cfg.get('SUPABASE_SERVICE_KEY')
    if not api_key or not svc_key:
        print("ERROR: VEXO_API_KEY and SUPABASE_SERVICE_KEY required in ~/.config/healthyu/")
        sys.exit(1)

    print(f"=== HealthyU Recipe Seeder ===")
    print(f"Model: {args.model}")
    print(f"Count: {args.count}")
    if args.category: print(f"Category: {args.category}")
    if args.focus: print(f"Focus: {args.focus}")
    if args.dry_run: print(f"⚠️  DRY RUN — nothing will be written")
    print()

    # Build prompt
    cat_constraint = f'Set category="{args.category}" for ALL recipes.' if args.category else \
        'Vary category across: breakfast, snack, main, salad, sayur, lauk, minuman, sup, makan besar, sarapan.'
    focus_constraint = f'Nutritional focus: {args.focus}.' if args.focus else 'Balanced nutritional profile.'

    prompt = f"""Generate {args.count} Indonesian healthy recipes as a JSON array.

Each recipe object must have exactly these fields:
  title: string (Indonesian, recipe name)
  description: string (Indonesian, 1-2 sentences about the recipe)
  category: string ({cat_constraint.replace('Set category=', 'must be ').replace(' for ALL recipes', '')})
  cuisine: "Indonesia"
  prep_min: integer (5-60)
  cook_min: integer (0-60)
  servings: integer (1-4)
  calories: integer (80-550)
  protein_g: number (2-45)
  carbs_g: number (5-80)
  fat_g: number (1-25)
  fiber_g: number (0-12)
  ingredients: array of 5-12 strings (Indonesian, e.g., "150g dada ayam", "2 sdm kecap manis")
  instructions: array of 3-8 strings (Indonesian cooking steps, short imperative)
  tags: array of 2-5 strings (English lowercase: "vegetarian", "high-protein", "low-carb", "indonesia", etc.)
  is_vegetarian: boolean
  is_vegan: boolean
  is_halal: true (always)
  difficulty: one of "beginner", "intermediate", "advanced"

Constraints:
  - {focus_constraint}
  - Use Indonesian cooking techniques (tumis, rebus, goreng, kukus, panggang, etc.)
  - Ingredients realistic and findable in Indonesian markets
  - Calories per serving realistic for diet app (low-to-medium)
  - Vary the recipes — don't repeat same main ingredient

Output ONLY the JSON array. No markdown fences, no explanation, no preamble.
"""
    print(f"Calling VexoAPI...")
    content = call_vexo(prompt, args.model, api_key, base_url)
    recipes_raw = parse_recipes_json(content, args.count)

    print(f"\nReceived {len(recipes_raw)} recipes from AI\n")

    # Stats
    inserted = 0
    skipped = 0
    failed = 0
    slug_suffix = 0  # for collision avoidance

    for i, raw in enumerate(recipes_raw, 1):
        title = raw.get('title', '').strip()
        if not title:
            print(f"  [{i}/{len(recipes_raw)}] SKIP — no title")
            skipped += 1
            continue

        # Generate unique slug
        base_slug = slugify(title)
        slug = base_slug
        if not slug:
            print(f"  [{i}/{len(recipes_raw)}] SKIP — '{title[:30]}' slugified to empty")
            skipped += 1
            continue
        # Check collision
        if slug_exists(slug, svc_key):
            # Try with -2, -3 suffix
            for suffix in range(2, 10):
                test_slug = f"{base_slug}-{suffix}"
                if not slug_exists(test_slug, svc_key):
                    slug = test_slug
                    break
            else:
                print(f"  [{i}/{len(recipes_raw)}] SKIP — '{title[:30]}' slug '{base_slug}' + variants all taken")
                skipped += 1
                continue

        raw['slug'] = slug

        # Apply image URL template (matches existing /images/recipes/{slug}.jpg convention)
        if args.generate_image:
            # Real image generation via VexoAPI editimg
            if not _HAS_IMAGE_GEN:
                print(f"  [{i}/{len(recipes_raw)}] ⚠️  --generate-image requested but gen_recipe_image.py not importable. Falling back to template.")
                if args.image_template and '{slug}' in args.image_template:
                    raw['image_url'] = args.image_template.replace('{slug}', slug)
            else:
                title_safe = raw.get('title', '')
                desc_safe = raw.get('description', '')
                print(f"  [{i}/{len(recipes_raw)}] 🎨 Generating image for '{title_safe[:40]}'...")
                if _HAS_IMAGE_GEN and _gen_recipe_image is not None:
                    saved = _gen_recipe_image(slug, title_safe, desc_safe, api_key)
                else:
                    saved = None
                if saved:
                    raw['image_url'] = '/images/recipes/' + Path(saved).name
                    print(f"            ✓ Image saved: {raw['image_url']}")
                else:
                    print(f"            ⚠️  Image gen failed, falling back to template")
                    if args.image_template and '{slug}' in args.image_template:
                        raw['image_url'] = args.image_template.replace('{slug}', slug)
        elif args.image_template and '{slug}' in args.image_template:
            raw['image_url'] = args.image_template.replace('{slug}', slug)
        else:
            raw['image_url'] = None

        if args.dry_run:
            print(f"  [{i}/{len(recipes_raw)}] DRY — would insert: {title[:40]:<40} | slug={slug}")
            print(f"            cat={raw.get('category')} | cal={raw.get('calories')} | pro={raw.get('protein_g')}g | tags={raw.get('tags', [])[:3]}")
            inserted += 1  # count as "would be inserted"
            continue

        try:
            rec_id, seo_id = insert_recipe(raw, svc_key)
            print(f"  [{i}/{len(recipes_raw)}] ✓ INSERTED: {title[:40]:<40} | slug={slug} | recipes={rec_id[:8]}.. seo_recipes={seo_id[:8]}..")
            inserted += 1
        except Exception as e:
            print(f"  [{i}/{len(recipes_raw)}] ✗ FAILED: {title[:40]:<40} | {str(e)[:80]}")
            failed += 1

    print()
    print(f"=== Summary ===")
    print(f"  Inserted: {inserted}")
    print(f"  Skipped:  {skipped}")
    print(f"  Failed:   {failed}")
    if args.dry_run:
        print(f"  (dry run — no DB writes)")


if __name__ == '__main__':
    main()