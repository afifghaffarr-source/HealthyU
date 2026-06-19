# Sprint 2c: Vision AI Integration — Plan

## Status: PLAN READY, AWAITING USER CONFIRMATION

Created: 2026-06-19

## Problem

VexoAPI catalog (verified 2026-06-19) has ZERO vision-capable models.
All 11 models are text-only. Image inputs to text-only models throw 400.

Sprint 2b workaround (text-only AI parser) works for nutrition labels but is
limiting for:

- Recipe image → ingredients parsing (currently dead)
- Menu image → restaurant OCR (currently dead)
- Fridge photo → recipe suggestions (currently dead)
- Chat with image (currently dead — shows 📷 but AI can't see)

## Options Audited

### Path A — OpenRouter free (no top-up)

- Limit: 50 RPD total across ALL `:free` models
- Cost: $0
- Effort: 2-3 days dev
- Reliability: 50/day shared (text + vision) — tight

### Path B — OpenRouter + $10 top-up ⭐ RECOMMENDED

- Limit: 1000 RPD for `:free` models
- Cost: $10 one-time
- Effort: 2-3 days dev
- Reliability: 1000/day for free models (more than enough for early app)
- Upgradeable to paid (~$0.50-5/mo for 100k scans) if needed

### Path C — OpenRouter paid (no top-up, pure pay-as-you-go)

- Limit: Based on credits
- Cost: $0.05-0.50 per 1M tokens (pennies per 1000 scans)
- Effort: 2-3 days dev
- Reliability: Unlimited within budget
- Best for: scaling post-launch

### Path D — Self-host vision model on VPS (Ollama + LLaVA)

- Limit: Unlimited
- Cost: $0 but uses VPS CPU
- Effort: 1 week dev
- Reliability: Slow (~10-30s per scan on CPU)
- Best for: privacy-first, no API dependency

## Recommended Architecture (Path B)

```
┌─────────────────────────────────────────────────────────┐
│ HYBRID ARCHITECTURE                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  User upload foto                                       │
│       ↓                                                 │
│  ┌─ Client-side ────────────────────────────────────┐   │
│  │ 1. Compress 4MB → 500KB (canvas resize)         │   │
│  │ 2. Tesseract OCR (offline, gratis, instant)     │   │
│  │ 3. Cache hash → cek Supabase cache              │   │
│  └─────────────────────────────────────────────────┘   │
│       ↓ (jika confidence rendah ATAU user minta AI)     │
│  ┌─ Server-side fallback chain ─────────────────────┐   │
│  │ 1. OpenRouter free vision (gemini-2.0-flash)    │   │
│  │     ↓ (kalau 429/limit)                         │   │
│  │ 2. OpenRouter free text (parse OCR text)        │   │
│  │     ↓ (kalau 429/limit)                         │   │
│  │ 3. VexoAPI text (yang udah jalan sekarang)      │   │
│  │     ↓ (kalau error)                             │   │
│  │ 4. Pure Tesseract + regex parser (always works) │   │
│  └─────────────────────────────────────────────────┘   │
│       ↓                                                 │
│  Save result + cache key (image_hash → result, 30 hari) │
└─────────────────────────────────────────────────────────┘
```

## Required from User

1. Sign up at https://openrouter.ai (email + password, ~2 min)
2. Create API key at https://openrouter.ai/keys
3. (Recommended) Top up $10 at https://openrouter.ai/credits
4. Save API key to VPS:
   ```bash
   ssh ubuntu@vps
   echo "sk-or-v1-..." > ~/.config/healthyu/openrouter-api-key
   chmod 600 ~/.config/healthyu/openrouter-api-key
   ```

## Implementation Plan (2-3 days after API key received)

| #         | Task                                                        | LOC          | Est time |
| --------- | ----------------------------------------------------------- | ------------ | -------- |
| 1         | `openrouterProvider.ts` — parallel provider                 | ~80          | 2h       |
| 2         | `callAiProvider()` — unified multi-provider                 | ~120         | 3h       |
| 3         | Routing logic — vision → OpenRouter                         | ~50          | 1h       |
| 4         | `MODEL_TO_PROVIDER` registry                                | ~60          | 1h       |
| 5         | Image compression util (client)                             | ~70          | 2h       |
| 6         | Result caching (Supabase hash-based)                        | ~100         | 3h       |
| 7         | Update 5 scan flows (nutrition, recipe, menu, fridge, chat) | ~200         | 4h       |
| 8         | Tests + deploy                                              | ~150         | 3h       |
| **Total** |                                                             | **~830 LOC** | **~19h** |

## Cost Analysis (Path B with $10 top-up)

- Free tier: 1000 RPD for `:free` models = ~30k scans/month
- Vision via `openrouter/free`: $0 (within free tier)
- Text via VexoAPI: $0 (current state)
- Upgrade cost (if exceeds 1000 RPD): ~$0.50-5/month for HealthyU

## Decision Tree

```
Is user OK with $10 one-time top-up?
├── YES → Path B (recommended)
├── NO, want $0 forever
│   ├── OK with 50 RPD limit? → Path A
│   ├── Can self-host? → Path D
│   └── Want pay-per-use? → Path C
└── NO, want different approach
    └── Discuss alternatives
```
