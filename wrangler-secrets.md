# Wrangler secrets to set manually (encrypted at rest in CF dashboard)

#

# Why this file exists: CF Workers `secrets` are encrypted env vars. They cannot

# live in wrangler.jsonc (which is committed to git). Set them once via:

#

# cd ~/projects/HealthyU

# export CLOUDFLARE_API_TOKEN=\*\*\* # or use `wrangler login`

# for secret in SUPABASE_SERVICE_ROLE_KEY VEXO_API_KEY VEXO_BASE_URL CRON_SECRET VAPID_PRIVATE_KEY VAPID_PUBLIC_KEY; do

# wrangler secret put $secret

# # paste the value from ~/.config/healthyu/production.env when prompted

# done

#

# Verify with: wrangler secret list

#

# Note: SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY are public values (anon key),

# so they live in wrangler.jsonc `vars` (safe to commit).

#

# List of secrets to set (5 total):

# - SUPABASE_SERVICE_ROLE_KEY (admin access to Supabase, RLS bypass)

# - VEXO_API_KEY (AI gateway, $$$$ cost)

# - VEXO_BASE_URL (Vexo endpoint)

# - CRON_SECRET (timing-safe bearer for cron endpoints)

# - VAPID_PRIVATE_KEY (web push server key)

# - VAPID_PUBLIC_KEY (web push client key, safe to expose but kept secret for symmetry)
