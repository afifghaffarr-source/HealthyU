# VexoAPI supported models (tested 2026-06-17, post-migration)

> **Migration 2026-06**: VexoAPI moved from `vexoapi.dev` (NXDOMAIN) to
> `vexoapi.site`. Path is unchanged: `/api/v1/chat/completions`. Auth is
> unchanged: `Authorization: Bearer *** See `README.md`for the canonical
reference and`https://github.com/AzzamCyber/VexoAPI` for upstream docs.

# Endpoint: POST https://vexoapi.site/api/v1/chat/completions

# Auth: Authorization: Bearer \*\*\* (free-tier nanoid keys are 16 chars)

# Body: { model, messages, max_tokens, temperature, stream }

# Response: OpenAI-compatible { id, model, choices: [{ message: { content } }] }

## Working free-tier models (verified 2026-06-17 via curl):

# - openai/gpt-oss-120b:free (general, 200 OK, OpenInference provider)

# - google/gemma-4-31b-it:free (31B, listed in /docs as default OpenAI example)

# - llama-3.1-8b-instant (fast, 200 OK, returns plain text)

# - qwen/qwen3-32b (reasoning, 200 OK, returns <think> blocks)

# - meta-llama/llama-3.3-70b-instruct:free (70B, free)

# - anthropic/claude-fable-5 (Claude, paid — not on free tier)

## Restricted (403, requires VIP key):

# - deepseek/deepseek-v4-flash (private, VIP only)

# - deepseek/deepseek-v4-pro (private, VIP only)

# - DeepSeek-V3.1, V3.2 (private)

## Legacy Vexo API (DEPRECATED, returns 405 catch-all):

# - GET /api/{endpoint}?key={key} (replaced by OpenAI-compat POST)

# - Endpoints: gptoss120b, glm47flash, gemini (all 405)

## New Vexo API (USE THIS):

# - POST /api/v1/chat/completions

# - Authorization: Bearer \*\*\*

# - Body: OpenAI-compatible

# - Response: { id, model, choices: [{ message: { content } }] }

## Rate limits (free tier per `https://github.com/AzzamCyber/VexoAPI`):

# - 100 requests / 5 hours per API key

# - 2 active keys max per IP

# - 16-char nanoid key format

## Generate a new key (if rotation needed):

# 1. Visit https://vexoapi.site (or legacy https://vexoapi.azzamcodex.site)

# 2. Click "Generate Key" — no registration required

# 3. Replace `VEXO_API_KEY` in:

# - Local: `/home/ubuntu/.config/healthyu/production.env`

# - Production: `wrangler secret put VEXO_API_KEY` (see docs/cloudflare-deploy.md)
