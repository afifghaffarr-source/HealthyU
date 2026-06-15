# Fix Prompt — Fase 2: Security & Data Safety Hardening

> **Status: ✅ COMPLETE 2026-06-15** — branch `fix/audit-fase-2-security` pushed, **PR #3 merged** (SHA `5e2ed50b`).
> 4 commit: 29aa5ecf (AUDIT-005), 260b699a (AUDIT-013), c42a06e8 (AUDIT-010), 5c54a99e (AUDIT-014).
> Plus branch protection set via API + AUDIT-015 critical check PASSED.
>
> All static gates green: tsc 0, lint 0 errors, tests 336/336, build 26s.
>
> Prompt di bawah ini adalah salinan asli yang dipakai. Digunakan sebagai template untuk Fase 3.

---

## Copy-Paste Prompt

```
Tugas: Eksekusi Fase 2 dari audit HealthyU.

# Konteks
HealthyU di ~/projects/HealthyU. Audit di audit/01-findings.md. Fase 1 sudah merged.
AGENTS.md rule tetap berlaku.

# Branch
Buat branch: fix/audit-fase-2-security
Base: main (setelah Fase 1 merged).

# Findings yang harus diperbaiki (urut)

## 1. AUDIT-005 (HIGH) — Verify CI gates lint
TUGAS:
- Baca .github/workflows/ci.yml.
- Identifikasi: apakah `bun run lint` dijalankan?
- Apakah ada branch protection yang require lint pass?
- Lapor state saat ini: apakah CI gagal jika lint fail?

ACTIONS (tergantung state):
A) Jika CI tidak jalankan lint:
   - Tambah step "Run lint" di matrix.
   - Set sebagai required check.
B) Jika CI jalankan lint tapi tidak required:
   - Set branch protection rule.
C) Jika CI sudah lengkap:
   - Tutup finding dengan konfirmasi.

VERIFIKASI: Push PR dengan intentional `as any` di test file → CI harus fail.

## 2. AUDIT-009 (MEDIUM) — Server bundle 9.8MB audit
TUGAS:
- ANALYZE=1 bun run build → buka dist/bundle-stats.html
- Identifikasi top-5 chunks by size di dist/server/assets/
- Cek: apakah `cloudflare-env.server-*.js` di-import dari client component? (grep)
- Cek: apakah `scan.barcode-*.js` di-import dari server bundle padahal hanya untuk client?
- Report: top-5 chunks, size, dependencies

TIDAK PERLU refactor di Fase 2 — hanya audit. Refactor di Fase 3.

## 3. AUDIT-010 (MEDIUM) — Replace console.log di .server.ts
TUGAS:
- grep -rn "console\." src/ --include="*.server.ts" → list 11 file
- Baca src/lib/logger.server.ts untuk pahami API yang ada.
- Per file: replace `console.log`/`console.error` dengan `logger.info`/`logger.error`.
- Untuk yang punya error context (e.g. "userId: 123"), gunakan logger yang redact PII.

CONTOH:
  console.error("[useSpeech] recognition error", e);
  // →
  import { logger } from "@/lib/logger.server";
  // ...
  logger.error({ err: e, boundary: "useSpeech" }, "recognition error");

VERIFIKASI:
- grep "console\." src/ --include="*.server.ts" → 0
- bun run test → 336/336
- bun run build → sukses

## 4. AUDIT-013 (IMPROVEMENT) — Rename vexoAdapter.ts → .server.ts
TUGAS:
- git mv src/features/ai/lib/vexoAdapter.ts src/features/ai/lib/vexoAdapter.server.ts
- Update import di:
  - src/features/ai/lib/aiStreamGateway.server.ts (line 2)
  - src/features/ai/lib/aiGateway.server.ts (jika ada import)
  - src/features/ai/lib/__tests__/vexoAdapter.test.ts
- Cek: apakah ada .tsx file yang import vexoAdapter? (grep)
  - Jika ya, ini lebih serius → escalate, jangan rename.
  - Jika tidak, lanjut rename.

VERIFIKASI:
- bunx tsc --noEmit → 0 errors
- bun run test → 336/336
- bun run build → sukses
- grep "vexoAdapter" src/**/*.tsx → 0

## 5. AUDIT-014 (IMPROVEMENT) — Audit *.functions.ts convention
TUGAS:
- List semua *.functions.ts di src/:
  find src -name "*.functions.ts" -not -path "*/node_modules/*"
- Per file: cek import chain. Apakah ada .tsx yang import langsung?
  - Jika ya, file itu risiko. Highlight.
  - Jika tidak, aman.
- Tambah eslint rule (di eslint.config.js) untuk enforce:
  "Tidak boleh import file *.server.ts atau *.functions.ts dari *.tsx (kecuali via barrel)"

CONTOH rule (di eslint.config.js):
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{
        group: ["**/*.server", "**/*.server.ts", "**/*.functions"],
        message: "Server functions should be called via createServerFn from a server context, not imported directly into client components."
      }]
    }]
  }

VERIFIKASI:
- bun run lint → 0 errors (atau kurang dari 5 untuk rule baru yang masih adapt)
- Audit list of unsafe patterns dari output.

## 6. AUDIT-015 (CRITICAL CHECK) — Verify cloudflare-env.server isolation
⚠️ INI CHECK PALING PENTING DI FASE 2. ⚠️

TUGAS:
- bun run build (pastikan dist/ ter-rebuild)
- Jalankan:
  grep -r "SUPABASE_SERVICE_ROLE" dist/client/ 2>/dev/null
  grep -r "VEXO_API_KEY" dist/client/ 2>/dev/null
  grep -r "VAPID_PRIVATE_KEY" dist/client/ 2>/dev/null
  grep -r "CRON_SECRET" dist/client/ 2>/dev/null
- HASIL:
  A) Empty (no match) → CONFIRMED isolated. Update finding ke RESOLVED.
  B) Match → CRITICAL DATA LEAK. Stop. Escalate immediately.

VERIFIKASI (jika A): Document di audit/01-findings.md dengan output grep.
VERIFIKASI (jika B): Treat sebagai P0 incident. Rollback deployment. Audit import chain.

# Acceptance Criteria
- [ ] CI workflow baca lint + lint pass
- [ ] Server bundle top-5 audit selesai
- [ ] 0 console.log di *.server.ts
- [ ] vexoAdapter renamed + 0 client import
- [ ] *.functions.ts import chain audited + eslint rule aktif
- [ ] **CRITICAL: cloudflare-env.server isolation verified** (no service role in client bundle)
- [ ] bunx tsc --noEmit → 0 errors
- [ ] bun run test → 336/336
- [ ] bun run build → sukses

# Commit (terpisah per finding)
  chore(audit-005): verify CI gates lint
  chore(audit-009): server bundle audit report
  chore(audit-010): replace console.log di .server.ts dengan logger
  chore(audit-013): rename vexoAdapter ke .server.ts
  chore(audit-014): tambah eslint rule enforce *.server.ts convention
  chore(audit-015): verify cloudflare-env.server tidak bocor ke client

Push ke origin:fix/audit-fase-2-security. BUKAN main.

# Lapor Balik
Format: progress + 1-paragraph summary per finding + blocker (jika ada, terutama AUDIT-015 jika leak detected) + next step (Fase 3).
```

---

## Catatan Auditor

- **AUDIT-015 adalah blocker** — kalau terbukti bocor, perlakukan sebagai P0 security incident.
- **ESLint rule** bisa menyebabkan false positive di awal. Set ke "warn" dulu 1 sprint, lalu "error".
- **Logger refactor** butuh baca `logger.server.ts` dulu untuk pahami API.
- **CI verification** idealnya dilakukan dengan PR test, bukan di local.

## Risiko & Mitigasi

| Risiko                              | Mitigasi                                                      |
| ----------------------------------- | ------------------------------------------------------------- |
| CI change block PR yang lain        | Koordinasi dengan tim, atau set branch baru dulu untuk verify |
| Logger API berbeda dari console.log | Baca logger.server.ts dulu, mapping 1:1                       |
| Rename vexoAdapter break barrel     | Test di dev mode + production build sebelum commit            |
| AUDIT-015 reveal critical leak      | **Rollback deploy + audit + P0 incident response**            |
