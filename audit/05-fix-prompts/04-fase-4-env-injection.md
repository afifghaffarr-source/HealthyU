# Fix Prompt — Fase 4: Lighthouse CI Env Injection (DEFERRED)

> **Untuk di-copy-paste** oleh future agent yang mau tackle proper fix.
> **Status saat ini:** ⚠️ DEFERRED — workaround applied (lhci URL scope = 3 static route), proper fix butuh dedicated session.
> **Risiko:** Medium-High (Vite internal SSR mechanism + CF Workers runtime mismatch).
> **Target branch:** `fix/audit-fase-4-lighthouse-proper` (fresh branch, setelah fase 1-4 merged).
> **Source investigation:** commit `15c8b60d` (initial attempt) + `0f8673f2` (revert) + skill `vite-cf-ssr-env-isolation`.

---

## Copy-Paste Prompt

```
Tugas: Implement proper fix untuk LIGHTHOUSE-001 di HealthyU.

# Konteks
HealthyU di ~/projects/HealthyU. Audit di audit/01-findings.md. Fase 1-4 sudah merged.
AGENTS.md rule tetap berlaku. Branch protection: 5 required status checks (lint, tsc, test, build, lhci).

# Problem (LIGHTHOUSE-001)
- `bunx vite preview` returns 500 di /artikel & /faq (SSR routes).
- Error: `[Supabase] Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY`.
- Workaround aktif: lighthouserc.json URL scope = `[/, /auth, /scan]` (3 static route, 2 SSR route dropped).
- Production TIDAK terpengaruh (CF Workers runtime inject env native via fetch handler).
- Goal: re-include /artikel & /faq di lhci audit scope.

# Root Cause (jangan re-invent)
`vite preview` jalankan SSR worker-entry di V8 ISOLATE terpisah (ModuleRunner worker). Mutations ke
`process.env` atau `globalThis` dari Vite plugin `configurePreviewServer` hook TIDAK visible ke isolate.
Ini BUKAN bug Vite — ini by design (isolate isolation for security).

Detail + smoke-gun debug steps: skill `vite-cf-ssr-env-isolation` di ~/.hermes/skills/.

# Pilihan Fix (PICK ONE — rekomendasikan Option B)

## Option A: Custom PreviewServer middleware + custom server-entry.ts
Effort: M (4-8 jam). Risiko: Medium (Vite internal API, bisa break di minor upgrade).

TUGAS:
  1. Buat vite-plugins/cf-preview-ssr-bridge.ts:
     - configurePreviewServer hook baca dist/server/.dev.vars
     - Middleware intercept request, inject env ke req header
     - Re-export worker-entry fetch handler dengan env dari header

  2. Modifikasi src/server-entry.ts (atau bikin custom server-entry):
     - Baca env dari request header (kalau ada) atau process.env (production)
     - Pass env ke fetch handler via AsyncLocalStorage (existing pattern di
       src/lib/cloudflare-env.server.ts)

  3. Update vite.config.ts: register plugin + point ke custom server-entry.

  4. Update lighthouserc.json: kembalikan /artikel & /faq ke URL array.

  5. Verify:
     - bunx vite preview --port 4173 --strictPort
     - curl http://localhost:4173/artikel → 200 (was 500)
     - curl http://localhost:4173/faq → 200 (was 500)
     - lhci autorun di CI → 5/5 routes pass

## Option B: Migrasi Lighthouse CI ke wrangler pages dev (RECOMMENDED)
Effort: XS (30 menit). Risiko: Low (official CF tool, identik production runtime).

TUGAS:
  1. Edit .github/workflows/lighthouse.yml:
     - Ganti `bunx vite preview --port 4173 --strictPort` jadi
       `wrangler pages dev ./dist --port 4173 --compatibility-date=2024-01-01`
     - Tambah step: `echo "COMPATIBILITY_DATE=2024-01-01" >> $GITHUB_ENV` (jika perlu)

  2. Update lighthouserc.json: kembalikan /artikel & /faq ke URL array (5/5 routes).

  3. Verify lhci config wrangler pages dev support:
     - Bunx wrangler pages dev butuh CF account_id (CI secret `CLOUDFLARE_ACCOUNT_ID`)
     - Atau pakai `--compatibility-date` flag tanpa login (dev mode, env dari .dev.vars)

  4. Verify di local:
     - bun run build
     - wrangler pages dev ./dist --port 4173
     - curl http://localhost:4173/artikel → 200
     - curl http://localhost:4173/faq → 200

  5. Verify di CI:
     - Push branch fix/audit-fase-4-lighthouse-proper
     - GitHub Actions run lhci → 5/5 routes pass

# Branch & PR
Buat branch: fix/audit-fase-4-lighthouse-proper
Base: main (setelah fase 1-4 merged).
Push + buka PR. Title: "fix(lighthouse): include SSR routes in lhci via [Option A/B]".

# Static Gates (wajib pass)
  - bunx tsc --noEmit → 0 errors
  - bun run lint → 0 errors
  - bun run test → 336/336 (atau lebih, jangan kurangi)
  - bun run build → success
  - lhci autorun → 5/5 routes ≥ 90 score (target Lighthouse mobile)

# Lapor Balik
Format: which option (A/B) + step-by-step result + lighthouse score per route + blocker
(jika ada, terutama Option A yang involve Vite internal API) + next step.
```

---

## Catatan Auditor

### Kenapa DEFERRED?

- **Plugin approach proven non-functional** (commit `15c8b60d` → `0f8673f2`):
  - 5 iterasi plugin: `globalThis` → `process.env` direct → confirmed isolate isolation.
  - Smoke-gun: debug log di bundled `client.ts` tunjukin `process.env keys count=0` di SSR.
  - Conclusion: Vite plugin `configurePreviewServer` BUKAN surface yg bisa inject env ke SSR isolate.
- **Proper fix = non-trivial**: butuh paham Vite ModuleRunner mechanism + custom server-entry OR migrasi runtime.
- **Production ga impact**: CF Workers runtime native handle env. Cuma Lighthouse CI local preview yg kena.
- **Workaround cukup buat sekarang**: lhci audit 3 static route (home, auth, scan) yg exercise most UX patterns.

### Apa yang sudah kita save dari investigasi ini

- **Skill `vite-cf-ssr-env-isolation`** (276 lines) — root cause analysis, smoke-gun debug steps,
  decision matrix, all failed approaches documented, all working alternatives documented.
  **WAJIB di-load** sebelum tackle proper fix. Save 2-3 jam re-discovery.
- **`wrangler.jsonc` updated** — `SUPABASE_PUBLISHABLE_KEY` di `secrets.required`. Production deploy
  bakal fail-fast kalo secret missing. Independent dari this task.
- **Audit/01-findings.md entry** — LIGHTHOUSE-001 documented dengan full context + commit refs.

### Kenapa Option B direkomendasikan

|                        | Option A (custom middleware)                      | Option B (wrangler pages dev) |
| ---------------------- | ------------------------------------------------- | ----------------------------- |
| **Effort**             | 4-8 jam                                           | 30 menit                      |
| **Risk**               | Medium (Vite internal API, bisa break di upgrade) | Low (official CF tool)        |
| **Runtime fidelity**   | 95% (custom bridge)                               | 100% (production runtime)     |
| **Maintenance burden** | Medium (kita maintain plugin)                     | Low (CF maintain tool)        |
| **CI cost**            | Sama                                              | Sama                          |
| **Local dev**          | Lebih ringan (vite preview)                       | Lebih berat (wrangler)        |

Trade-off: Option B heavier untuk local dev, tapi **zero maintenance** + **production-identical** = worth it.

### Pitfalls yg harus dihindari (saat tackle proper fix)

- **Jangan** coba `apply: "build"` filter di plugin `configurePreviewServer` — silently skip preview.
- **Jangan** baca `.dev.vars` dari project root — `@cloudflare/vite-plugin` write ke `dist/server/.dev.vars` at build time.
- **Jangan** hardcode VAPID key values di doc (cuma reference aja). VAPID PUBLIC key aman, PRIVATE key jangan.
- **Jangan** disable Vite isolate untuk "fix" — itu security feature, jangan di-bypass.
- **Hati-hati** dengan `wrangler pages dev` di CI: butuh CF account_id + compatibility_date. Test local dulu.

---

## Risiko & Mitigasi

| Risiko                                                        | Mitigasi                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Option A break di Vite minor upgrade                          | Pin Vite version di package.json, atau migrate ke Option B                    |
| `wrangler pages dev` lambat di CI                             | Increase lhci timeout di lighthouserc.json (`settings.maxWaitForLoad: 60000`) |
| Custom server-entry.ts conflict dengan TanStack Start default | Baca TanStack Start custom server-entry docs dulu, atau pakai Option B        |
| LIGHTHOUSE-001 re-surface di production                       | Add smoke test: deploy to preview env, curl /artikel + /faq, expect 200       |
| Lighthouse score < 90 di mobile                               | Bundle optimization (AUDIT-004 dari Fase 3 udah di-defer, bisa di-revisit)    |

---

## Reference

- **Skill**: `vite-cf-ssr-env-isolation` di `~/.hermes/skills/`
- **Audit doc**: `audit/01-findings.md` → section 3 → LIGHTHOUSE-001
- **Failed attempt history**: commits `15c8b60d` (initial) + `0f8673f2` (revert) di branch `fix/audit-fase-4-env-injection`
- **Workaround applied**: `fix/lighthouse-ci-env` branch, commit `00c79e79` (lhci URL scope = 3 static routes)
- **Related CF/Vite docs**:
  - https://developers.cloudflare.com/pages/functions/local-development/
  - https://vitejs.dev/guide/api-plugin.html#configureserver
  - https://tanstack.com/start/latest/docs/framework/react/advanced/custom-server-entry
