#!/bin/bash
export CLOUDFLARE_API_TOKEN=$(cat ~/.config/healthyu/cf-token)
wrangler deploy
