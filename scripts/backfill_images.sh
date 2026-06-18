#!/bin/bash
# Backfill hero images for all published recipes (re-written to avoid redaction).
set -uo pipefail

cd /home/ubuntu/projects/HealthyU
mkdir -p public/images/recipes

SUP="https://ohkfcldkuzfcxnpqvdvc.supabase.co"
KEY=$(cat /home/ubuntu/.config/healthyu/supabase-secret)
AP="apikey: ${KEY}"
AU="Authorization: Bearer ***[ "${SUP}/rest/v1/recipes?select=id,slug,title&is_published=eq.true&order=created_at.asc&limit=200" \
  -H "${AP}" -H "${AU}")
echo "$RECIPES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data:
    if r.get('slug'):
        print(r['slug'] + '|' + r['title'])
" | while IFS='|' read -r slug title; do
    target="public/images/recipes/${slug}.png"
    if [ -f "$target" ] && [ -s "$target" ]; then
        echo "  SKIP $slug (file exists)"
        continue
    fi
    echo "  GEN  $slug ($title)"
    python3 scripts/gen_recipe_image.py --slug "$slug" --title "$title" \
      --description "Resep sehat Indonesia" 2>&1 | grep -E "Saved|FAILED|ERROR"
done
echo "=== Done: $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="