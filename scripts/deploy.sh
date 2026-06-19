#!/usr/bin/env bash
# Step deploy helper — reads token from ~/.config/healthyu/cf-token
# Usage: ./scripts/deploy.sh
set -euo pipefail
export PATH="$HOME/.bun/bin:$PATH"
export CLOUDFLARE_API_TOKEN=*** ~/.config/healthyu/cf-token)
cd "$(dirname "$0")/.."
exec wrangler deploy
