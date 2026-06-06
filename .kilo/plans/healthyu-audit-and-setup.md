# HealthyU — Full Audit & Kilo Code Setup Plan

> Generated: 2026-06-06 | Mode: Architect / Plan (read-only)
> Project: HealthyU — Diet, kesehatan, nutrisi Indonesia berbasis AI

---

# BAGIAN 1 — BEGINNER SETUP CHECKLIST

## 1.1 Apakah project dibuka sebagai folder, bukan ZIP?

**Status: SUDAH BENAR.** Kamu sudah membuka `C:\Users\AfifGR\Documents\AFIF\HealthyU` sebagai folder. Git aktif, `node_modules` ada, semua file bisa dibaca.

**Yang perlu dilakukan:** Tidak ada. Sudah benar.

---

## 1.2 Apakah Git aktif?

**Status: AKTIF.** Branch `main`, up-to-date dengan `origin/main`.

**Catatan:** Tidak ada branch hardening khusus. Semua commit ada di `main` langsung.

**Yang perlu dilakukan:**

- Buat branch `security/hardening` sebelum mulai edit apapun:
  ```
  git checkout -b security/hardening
  ```
- Nanti setiap fase audit bisa dipecah jadi branch tersendiri (misal `fix/p0-security`, `fix/privacy`, dll)

---

## 1.3 Apakah ada branch khusus untuk hardening?

**Status: BELUM ADA.** Hanya ada `main`.

**Yang perlu dilakukan:** Buat branch hardening sebelum mulai implementasi.

---

## 1.4 Apakah ada file rules?

**Status: SUDAH ADA, LENGKAP.**

| File                        | Isi                                                                        |
| --------------------------- | -------------------------------------------------------------------------- |
| `AGENTS.md`                 | Instruksi Kilo Code: perintah, aturan, prioritas, pola kode                |
| `healthyu-project-rules.md` | 23 aturan wajib, prioritas, definition of done                             |
| `.kilo/kilo.json`           | Permission config (read/glob/grep/list: allow, edit: ask, bash: whitelist) |
| `.kilo/command/check.md`    | Command: typecheck + lint + test                                           |
| `.kilo/command/review.md`   | Command: review sebelum commit                                             |
| `.kilo/command/fix-bug.md`  | Command: cari & fix bug aman                                               |

**Penilaian:** Sangat bagus untuk project baru. Rules sudah mencakup security, privacy, AI safety, dan workflow.

---

## 1.5 Apakah permission Kilo terlalu bebas?

**Status: SUDAH AMAN.**

Analisis `kilo.json`:

- `read`, `glob`, `grep`, `list`: **allow** → Aman, ini read-only
- `bash`: **whitelist** → Hanya command spesifik yang di-allow (`bun run dev/test/lint/build`, `git status/diff/log/branch`, `bunx tsc`, `bun run preview/e2e`). Sisanya `ask`.
- `edit`: **ask** untuk semua file source → Kilo harus minta izin sebelum edit. `.env*` dan `*.lock` di-**deny**.
- `external_directory`: **deny** → Kilo tidak bisa akses di luar project folder.

**Rekomendasi:** Sudah bagus. Tidak perlu perubahan.

**Saran kecil (opsional):**

- Tambahkan `bun install` ke whitelist bash (sering dibutuhkan)
- Tambahkan `git add`, `git commit` ke whitelist jika mau Kilo bantu commit

---

## 1.6 Apakah auto-approve edit/terminal/delete sebaiknya dimatikan?

**Status: SUDAH DIMATIKAN.** Semua `edit` di `kilo.json` pakai `"ask"`, artinya Kilo akan minta konfirmasi sebelum setiap edit. Ini sangat aman untuk pemula.

**Rekomendasi:** Pertahankan. Jangan ubah ke `"allow"` sampai kamu benar-benar paham risikonya.

---

## 1.7 Package manager: Bun atau npm?

**Status: BUN.**

Bukti:

- `package.json` line 118: `"packageManager": "bun@1.2.21"`
- Ada `bun.lock` (bukan `package-lock.json` atau `yarn.lock`)
- Ada `bunfig.toml`
- `AGENTS.md` secara eksplisit: "Package manager: **Bun** (bukan npm/yarn/pnpm)"

**JANGAN pakai `npm install` atau `npx`.** Selalu pakai `bun`.

---

## 1.8 Command yang harus dipakai

| Fungsi               | Command             | Keterangan                         |
| -------------------- | ------------------- | ---------------------------------- |
| Install dependencies | `bun install`       |                                    |
| Dev server           | `bun run dev`       | localhost:8080                     |
| Typecheck            | `bunx tsc --noEmit` | Wajib setelah edit .ts/.tsx        |
| Lint                 | `bun run lint`      |                                    |
| Unit test            | `bun run test`      | Vitest, jsdom environment          |
| E2E test             | `bun run e2e`       | Playwright, butuh dev server jalan |
| Build                | `bun run build`     | Vite build untuk production        |
| Format               | `bun run format`    | Prettier                           |
| Bundle analyze       | `bun run analyze`   | Lihat `dist/bundle-stats.html`     |

---

## 1.9 File yang tidak boleh diedit sembarangan

| File/Pattern                         | Alasan                                                 |
| ------------------------------------ | ------------------------------------------------------ |
| `.env`                               | Berisi secrets lokal. Jangan edit, jangan commit       |
| `.env.example`                       | Template — edit hanya jika tambah env var baru         |
| `bun.lock`                           | Auto-generated oleh Bun. Jangan edit manual            |
| `src/routeTree.gen.ts`               | Auto-generated oleh TanStack Router                    |
| `src/integrations/supabase/types.ts` | Auto-generated oleh Supabase CLI                       |
| `supabase/migrations/*.sql`          | Migration sudah dijalankan. Jangan edit yang sudah ada |
| `tsconfig.json`                      | Konfigurasi TypeScript — hati-hati mengubah            |
| `vite.config.ts`                     | Sudah dikonfigurasi oleh Lovable — hati-hati           |
| `package.json`                       | Edit hanya jika tambah/ubah dependency                 |
| `public/push-sw.js`                  | Service worker — perlu perhatian khusus                |
| `src/server.ts`                      | Entry point Cloudflare Workers + CSP headers           |

---

## 1.10 Apakah perlu MCP sekarang?

**TIDAK PERLU.** MCP (Model Context Protocol) untuk integrasi dengan tool external (database browser, Figma, dll). Untuk fase audit dan MVP, Kilo Code sudah cukup tanpa MCP.

**Kapan perlu:** Nanti jika butuh Kilo query database Supabase langsung, atau integrasi dengan tool lain.

---

## 1.11 Apakah perlu Marketplace agent sekarang?

**TIDAK PERLU.** Marketplace agent untuk workflow khusus. Project kamu sudah punya:

- `AGENTS.md` dengan instruksi lengkap
- `.kilo/command/check.md`, `review.md`, `fix-bug.md`
- `.lovable/plan.md` dengan TasteSkill audit

**Kapan perlu:** Jika butuh agent khusus untuk deploy CI/CD, atau monitoring.

---

## 1.12 TasteSkill v2 sebaiknya dipakai untuk halaman apa saja?

**TasteSkill v2** adalah framework anti-"AI slop" (UI yang terlihat generik/template). Prinsipnya: desain harus terasa unik, bermakna, dan cocok untuk konteks Indonesia.

**Halaman yang SANGAT perlu TasteSkill v2:**

1. **Landing page** (`/`) — Kesan pertama. Harus punya hook kuat, bukan hero section template
2. **Auth page** (`/auth`) — Login/daftar harus terasa aman dan ramah
3. **Onboarding** — Proses pengisian data diri harus terasa personal
4. **Scan result** — Hasil scan makanan harus meyakinkan tapi tidak overclaim
5. **AI Coach/Chat** — Harus terasa seperti coach, bukan "dokter AI palsu"
6. **Dashboard** — Harus jelas dan tidak terlalu ramai
7. **Privacy/Trust UI** — Halaman privacy harus membangun trust

**Halaman yang TIDAK perlu terlalu banyak TasteSkill:**

- Settings internal
- Debug/dev tools
- Admin pages

---

# BAGIAN 2 — EXECUTIVE SUMMARY

## Overall Score: **7.2/10**

## Production Ready? **TIDAK** — Masih ada P0 issues

## Beta Ready? **HAMPIR** — Setelah fix P0 (estimated 2-3 hari kerja)

## Biggest Risk

**AI cost explosion + offline queue data leakage.** Budget enforcement fail-open by default, dan health data tersimpan tanpa expiry di IndexedDB.

## Fastest Path to Launch

1. Fix 3 P0 security issues (1 hari)
2. Fix privacy data handling (0.5 hari)
3. Run full test suite + build verification (0.5 hari)
4. Deploy beta ke Lovable Cloud (0.5 hari)

## Top 5 Strengths

1. **AI Gateway Architecture** — Centralized, fail-closed for expensive ops, budget enforcement, caching, tiered routing. Sangat bagus untuk MVP.
2. **Comprehensive RLS** — Semua tabel punya RLS policy dengan `auth.uid() = user_id`. SECURITY DEFINER functions sudah di-revoke dari public roles.
3. **UU PDP Compliance** — Data export (80+ tabel), account deletion, privacy flags. Sudah cukup untuk regulasi Indonesia.
4. **Chat Safety System** — Crisis detection, dangerous behavior blocking, medical disclaimers. Multi-language (ID/EN).
5. **Code Quality Infrastructure** — 42 test files, Vitest + Playwright, ESLint + Prettier, Lighthouse CI, bundle analyzer.

## Top 5 Critical Issues

1. **Rate limit fail-open by default** (`rateLimit.server.ts:25`)
2. **Offline queue stores health data without TTL/expiry** (`offline-queue.ts`)
3. **Image moderation fail-open on error** (`imageModeration.server.ts`)
4. **Daily coach push ignores notification preferences** (`daily-coach.ts`)
5. **Privacy mask doesn't strip sensitive fields when public_profile=true** (`privacy.ts`)

---

# BAGIAN 3 — SCORE BREAKDOWN

| #   | Area                          | Score  | Status     | Reason                                                                                                                                | Priority |
| --- | ----------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Dependency/Build Stability    | 8/10   | Good       | Bun lockfile, pinned deps, Vite 7, React 19. No conflicting managers.                                                                 | P3       |
| 2   | Architecture/Folder Structure | 8.5/10 | Good       | Clean feature-based structure, server/client separation, 46 features. Scan module over-modularized (36 files).                        | P3       |
| 3   | Code Quality                  | 7.5/10 | Good       | Consistent patterns (createServerFn, \*.server.ts). TypeScript strict mode. No unused var checks disabled.                            | P2       |
| 4   | Security                      | 7/10   | Needs Work | Good CSP/headers, RLS, cron auth. Issues: rate limit fail-open, image moderation fail-open, hardcoded Supabase host in HTML.          | P0       |
| 5   | Privacy (Health Data)         | 7/10   | Needs Work | UU PDP export/deletion, privacy flags. Issues: offline queue no TTL, privacy mask over-exposure, no data retention policy.            | P0       |
| 6   | Supabase RLS/Database         | 8.5/10 | Good       | All tables RLS-enabled, consistent policy pattern, SECURITY DEFINER hardened.                                                         | P2       |
| 7   | API/Server Functions          | 8/10   | Good       | All server functions use auth middleware. Validators via Zod. Good error handling.                                                    | P2       |
| 8   | AI Safety                     | 8/10   | Good       | Gateway, budget, cache, tiered routing, crisis detection, medical disclaimers. Image moderation fail-open is concern.                 | P1       |
| 9   | AI Cost Control               | 7.5/10 | Good       | Budget enforcement (10 req/hr free, 50 premium), cache, tiered routing. Fail-open on budget check is concern.                         | P1       |
| 10  | UI/UX                         | 7/10   | Needs Work | Good component library (shadcn/ui), but dashboard is card-heavy. See TasteSkill audit.                                                | P2       |
| 11  | TasteSkill v2 Anti-Slop       | 6.5/10 | Needs Work | Dashboard wall-of-cards, generic AI copy in places. Landing page needs stronger hook.                                                 | P2       |
| 12  | Performance                   | 7.5/10 | Good       | Bundle analyzer, SSR for public pages, client-only for auth. Lighthouse perf threshold 0.7.                                           | P3       |
| 13  | Testing                       | 7/10   | Needs Work | 42 test files is good for MVP. Missing: integration tests for server functions, E2E only 8 smoke tests, no scan/AI integration tests. | P2       |
| 14  | DevOps/Production Readiness   | 6.5/10 | Needs Work | No CI/CD pipeline visible, no staging environment, lighthouse CI config exists but unclear if automated.                              | P2       |
| 15  | SEO/Content                   | 8/10   | Good       | Dynamic sitemap, JSON-LD, robots.txt, canonical URLs, Indonesian content.                                                             | P3       |
| 16  | Medical Safety                | 7.5/10 | Good       | Chat safety system, medical disclaimers, crisis resources. AI explicitly not "dokter".                                                | P1       |
| 17  | Vibecoding Health             | 7/10   | Needs Work | Many "Changes" commit messages, no conventional commits. Good code structure despite this.                                            | P3       |
| 18  | Product Strategy              | 7.5/10 | Good       | 46 features is ambitious for MVP. Core loop (scan → track → coach) is clear.                                                          | P2       |
| 19  | Wild Innovation               | 8/10   | Good       | Pet system, gacha, family plans, meal stories, prayer integration — unique for Indonesian market.                                     | P3       |
| 20  | Lovable AI Readiness          | 8.5/10 | Good       | Lovable Cloud Auth, AI Gateway, project config, vite-tanstack-config. Well-integrated.                                                | P3       |
| 21  | Kilo Code Readiness           | 8.5/10 | Good       | AGENTS.md, project rules, kilo.json permissions, custom commands.                                                                     | P3       |

---

# BAGIAN 4 — P0 CRITICAL ISSUES

## P0-1: Rate Limit Fail-Open by Default

- **Title:** Rate limit membolehkan request saat RPC error
- **File:** `src/lib/rateLimit.server.ts:25`
- **Evidence:**
  ```ts
  // When RPC errors:
  return opts?.failClosed ? false : true;
  // Default (no failClosed): returns true = ALLOWED
  ```
- **Risk:** Jika Supabase RPC down atau timeout, semua rate limit dilampaui. Attacker bisa spam AI calls tanpa batas → cost explosion.
- **Fix:** Ubah default ke fail-closed (`return false`), atau wajibkan `failClosed: true` di semua AI-related rate limit calls.
- **How to test:** Mock RPC failure, verify request diblokir.
- **Effort:** 1 jam
- **Kilo-safe:** Ya
- **Lovable-safe:** Ya
- **Suggested prompt:**
  ```
  /fix-bug Rate limit di src/lib/rateLimit.server.ts default-nya fail-open.
  Saat RPC error, semua request dilewatkan. Ubah default jadi fail-closed
  (return false saat error). Pastikan semua caller yang butuh fail-open
  explicitly pass opts.failOpen = true.
  ```

## P0-2: Offline Queue Menyimpan Health Data Tanpa TTL/Expiry

- **Title:** IndexedDB offline queue menyimpan data kesehatan tanpa batas waktu
- **File:** `src/lib/offline-queue.ts`
- **Evidence:**
  ```ts
  // Queue stores: water, weight, meal, mood, vitals, workout
  // No TTL field on queue items
  // clearDead() exists but no automatic cleanup
  // Payloads stored as plaintext
  ```
- **Risk:** Data kesehatan (berat badan, mood, vitals) tersimpan plaintext di IndexedDB tanpa batas waktu. Jika device di-share atau dijual, data bisa diakses. Melanggar project rule #15.
- **Fix:**
  1. Tambah TTL field (misal 7 hari) pada queue items
  2. Tambah auto-cleanup saat flush/sync
  3. Tambah `clearAll()` yang dipanggil saat user logout
  4. Pertimbangkan encrypt payload (minimal obfuscate)
- **How to test:** Enqueue item, tunggu > TTL, verify auto-deleted. Verify clear saat logout.
- **Effort:** 2-3 jam
- **Kilo-safe:** Ya
- **Lovable-safe:** Ya
- **Suggested prompt:**
  ```
  /fix-bug Offline queue di src/lib/offline-queue.ts menyimpan data kesehatan
  (weight, vitals, mood) tanpa TTL/expiry. Tambah TTL 7 hari untuk setiap queue item,
  auto-cleanup saat flush, dan clearAll saat user logout. Tambah test baru.
  ```

## P0-3: Image Moderation Fail-Open on Error

- **Title:** Image moderation mengizinkan gambar saat AI moderation error
- **File:** `src/features/moderation/lib/imageModeration.server.ts`
- **Evidence:**
  ```ts
  // On moderation error, returns { safe: true, ... }
  // Fail-open pattern — allows image through on error
  ```
- **Risk:** Jika AI moderation down, gambar NSFW/violent bisa masuk ke storage. Untuk app kesehatan yang targetnya keluarga Indonesia, ini sangat berisiko.
- **Fix:** Ubah ke fail-closed (return `safe: false` saat error). Bisa dengan fallback ke rule-based check (file size, MIME type) sebelum fail-closed.
- **How to test:** Mock AI error, upload gambar, verify ditolak.
- **Effort:** 1 jam
- **Kilo-safe:** Ya
- **Lovable-safe:** Ya
- **Suggested prompt:**
  ```
  /fix-bug Image moderation di src/features/moderation/lib/imageModeration.server.ts
  fail-open saat error (mengizinkan gambar). Ubah jadi fail-closed (tolak gambar saat
  moderation error). Tambah log error untuk monitoring.
  ```

## P0-4: Daily Coach Push Abaikan Notification Preferences

- **Title:** Cron daily-coach mengirim push ke SEMUA subscriber tanpa cek preference
- **File:** `src/routes/api/public/hooks/daily-coach.ts`
- **Evidence:**
  ```ts
  // Sends push to ALL subscribed users
  // Does NOT check notification_preferences.daily_coach flag
  ```
- **Risk:** User yang sudah matikan notifikasi masih menerima push → spam, uninstall, complaint.
- **Fix:** Join dengan `notification_preferences` table, filter berdasarkan `daily_coach = true`.
- **How to test:** Set `daily_coach = false` untuk user, jalankan cron, verify tidak terima push.
- **Effort:** 1 jam
- **Kilo-safe:** Ya
- **Lovable-safe:** Ya
- **Suggested prompt:**
  ```
  /fix-bug Cron daily-coach di src/routes/api/public/hooks/daily-coach.ts mengirim
  push ke semua subscriber tanpa cek notification_preferences. Tambah join/filter
  dengan notification_preferences.daily_coach = true.
  ```

## P0-5: Privacy Mask Tidak Strip Sensitive Fields

- **Title:** `maskPublicProfile` mengembalikan semua field saat `public_profile=true`
- **File:** `src/lib/privacy.ts`
- **Evidence:**
  ```ts
  // When public_profile === true, returns full profile object unchanged
  // If caller passes object with email, health_conditions, etc — all exposed
  ```
- **Risk:** Jika ada caller yang pass profile dengan field sensitif (email, health_conditions, allergies), field tersebut ter-expose ke publik.
- **Fix:**
  1. Tambah whitelist field yang boleh di-expose saat public (name, avatar, level, streak)
  2. Strip semua field lain regardless of `public_profile` flag
- **How to test:** Pass profile dengan `email` dan `health_conditions`, verify di-strip.
- **Effort:** 1-2 jam
- **Kilo-safe:** Ya
- **Lovable-safe:** Ya
- **Suggested prompt:**
  ```
  /fix-bug Privacy mask di src/lib/privacy.ts tidak strip sensitive fields saat
  public_profile=true. Tambah whitelist field yang boleh di-expose (name, avatar,
  level, streak). Strip semua field sensitif lain (email, health_conditions, dll).
  ```

---

# BAGIAN 5 — P1 IMPORTANT ISSUES

## P1-1: supabaseAdmin Usage Terluas (139 matches)

- **Title:** Service role client dipakai di 139 tempat
- **File:** Multiple files across `src/`
- **Risk:** Setiap `supabaseAdmin` bypass RLS. Jika ada bug di logic, data user lain bisa terbaca.
- **Fix:** Audit setiap usage. Untuk query user-scoped, ganti dengan user-scoped client. Simpan `supabaseAdmin` hanya untuk cron, admin, dan cross-user operations.
- **Effort:** 2-3 hari (audit + refactor)
- **Priority:** P1

## P1-2: Commit Messages Tidak Konvensional

- **Title:** Mayoritas commit message hanya "Changes" atau "Work in progress"
- **Evidence:** `git log --oneline -20` menunjukkan:
  ```
  ff435b1 security: AI rate limit hardening + env hygiene + README production readiness
  b4103e1 Perbaiki layout UI chat
  a839ae8 Changes
  bf386cc Changes
  ab29b8d Changes
  ...
  ```
- **Risk:** Sulit track perubahan, sulit revert, sulit code review.
- **Fix:** Pakai conventional commits: `feat:`, `fix:`, `security:`, `refactor:`, `test:`, `docs:`.
- **Effort:** Mulai dari commit berikutnya

## P1-3: Hardcoded Supabase URL di HTML Preconnect

- **Title:** Supabase project URL hardcoded di `__root.tsx` preconnect tags
- **File:** `src/routes/__root.tsx:62-63`
- **Risk:** Exposes Supabase project ID in HTML source. Minor information disclosure.
- **Fix:** Baca dari `VITE_SUPABASE_URL` env var.
- **Effort:** 15 menit

## P1-4: CSP Butuh `unsafe-inline` dan `unsafe-eval`

- **Title:** CSP header melemah karena Vite requirement
- **File:** `src/server.ts`
- **Risk:** XSS mitigation berkurang. Namun ini trade-off yang diperlukan untuk Vite hydration.
- **Fix:** Pertimbangkan CSP nonce-based di masa depan. Untuk MVP, ini acceptable.
- **Effort:** Besar (CSP nonce perlu infrastruktur khusus)

## P1-5: E2E Tests Hanya 8 Smoke Tests

- **Title:** E2E coverage sangat minimal
- **File:** `e2e/smoke.spec.ts`
- **Risk:** Critical user flows (login, scan, meal log, chat) tidak ter-test end-to-end.
- **Fix:** Tambah E2E untuk: login flow, scan flow, meal logging, chat interaction.
- **Effort:** 2-3 hari

## P1-6: Dashboard Terlalu Banyak Cards

- **Title:** Dashboard menampilkan 20+ komponen card sekaligus
- **File:** `src/routes/_authenticated/dashboard.tsx`
- **Risk:** Information overload, especially on mobile. User bisa overwhelmed.
- **Fix:** Implement progressive disclosure — show 3-5 most important cards, sisanya collapsible/scrollable.
- **Effort:** 1-2 hari

## P1-7: No CI/CD Pipeline Visible

- **Title:** Tidak ada GitHub Actions atau CI/CD config
- **Risk:** Build/test tidak otomatis saat push/merge.
- **Fix:** Tambah GitHub Actions workflow: lint → typecheck → test → build → lighthouse.
- **Effort:** 1 hari

## P1-8: No Data Retention Policy

- **Title:** Tidak ada mekanisme auto-delete data lama
- **Risk:** Database akan terus membesar. Data kesehatan 2 tahun lalu mungkin tidak relevan.
- **Fix:** Tambah cron job untuk archive/delete data > 1 tahun (dengan user consent).
- **Effort:** 1-2 hari

---

# BAGIAN 6 — P2/P3 IMPROVEMENTS

## P2 Improvements

| #   | Issue                                            | File                        | Fix                                            | Effort   |
| --- | ------------------------------------------------ | --------------------------- | ---------------------------------------------- | -------- |
| 1   | Scan module terlalu modular (36 files)           | `src/features/scan/lib/`    | Consolidate batch files yang serupa            | 2-3 hari |
| 2   | Token estimation kasar di chat stream            | `api/chat.stream.ts:227`    | Gunakan tiktoken atau approximation lebih baik | 2 jam    |
| 3   | `X-Frame-Options` inconsistency                  | `server.ts` vs `start.ts`   | Harmonize ke DENY everywhere                   | 30 menit |
| 4   | Missing integration tests untuk server functions | -                           | Tambah test untuk critical server functions    | 3-5 hari |
| 5   | Newsletter form tidak benar-benar submit         | Landing page                | Wire up ke Supabase atau email service         | 1 hari   |
| 6   | No error boundary untuk route-level errors       | Routes                      | Tambah ErrorBoundary di route config           | 1 hari   |
| 7   | `reverseCalorie` bypass budget                   | `scanSocialA1.functions.ts` | Tambah rate limit check                        | 1 jam    |
| 8   | Service worker tidak cache strategy documented   | `push-sw.js`                | Tambah workbox untuk offline-first             | 2 hari   |

## P3 Improvements

| #   | Issue                                    | File            | Fix                                     | Effort                |
| --- | ---------------------------------------- | --------------- | --------------------------------------- | --------------------- |
| 1   | `noUnusedLocals: false` di tsconfig      | `tsconfig.json` | Enable untuk catch dead code            | 1 jam + fix dead code |
| 2   | No `.nvmrc` atau `.tool-versions`        | Root            | Tambah untuk developer experience       | 5 menit               |
| 3   | No CONTRIBUTING.md                       | Root            | Tambah guide untuk kontributor          | 1 jam                 |
| 4   | `prettierrc` format rules not documented | `.prettierrc`   | Sudah ada, tapi bisa ditambah comment   | 15 menit              |
| 5   | No Docker setup untuk local dev          | Root            | Opsional, tapi useful untuk consistency | 2-3 jam               |
| 6   | Git branch protection not verified       | GitHub          | Enable branch protection di GitHub      | 15 menit              |

---

# BAGIAN 7 — BUG LIST

| #   | Bug                        | Location                    | Reproduce                                    | Expected              | Actual                  | Fix                           | Priority |
| --- | -------------------------- | --------------------------- | -------------------------------------------- | --------------------- | ----------------------- | ----------------------------- | -------- |
| 1   | Rate limit fail-open       | `rateLimit.server.ts:25`    | Mock RPC error, send request                 | Request blocked       | Request allowed         | Change default to fail-closed | P0       |
| 2   | Offline queue no TTL       | `offline-queue.ts`          | Enqueue item, wait forever                   | Auto-expire           | Stays forever           | Add TTL + auto-cleanup        | P0       |
| 3   | Image mod fail-open        | `imageModeration.server.ts` | Mock AI error, upload image                  | Image rejected        | Image accepted          | Fail-closed on error          | P0       |
| 4   | Coach push ignores prefs   | `daily-coach.ts`            | Disable daily_coach pref, trigger cron       | No push received      | Push received           | Filter by preference          | P0       |
| 5   | Privacy mask over-exposure | `privacy.ts`                | Pass profile with email, public_profile=true | Email stripped        | Email exposed           | Add field whitelist           | P0       |
| 6   | Newsletter no-op           | Landing page                | Submit newsletter form                       | Email sent to backend | Only local state        | Wire to backend               | P2       |
| 7   | `X-Frame-Options` mismatch | `server.ts` + `start.ts`    | Inspect headers                              | Consistent DENY       | DENY wins but confusing | Harmonize                     | P3       |

---

# BAGIAN 8 — SECURITY MATRIX

| #   | Security Check                  | Status | Evidence                                                                   | Risk Level |
| --- | ------------------------------- | ------ | -------------------------------------------------------------------------- | ---------- |
| 1   | `.env` not tracked              | PASS   | `.gitignore` excludes `.env` and `.env.*`                                  | None       |
| 2   | No hardcoded secrets            | PASS   | All from `process.env.*`                                                   | None       |
| 3   | RLS enabled on all tables       | PASS   | All 73 migrations enable RLS                                               | None       |
| 4   | SECURITY DEFINER hardened       | PASS   | Revoked from anon/PUBLIC in migrations `20260605113135` + `20260606010618` | None       |
| 5   | Cron auth with CRON_SECRET      | PASS   | `requireCronSecret()` with timing-safe comparison                          | None       |
| 6   | CSP headers                     | PASS   | Full CSP in `server.ts`, security headers in `start.ts`                    | Low        |
| 7   | CSP uses `unsafe-inline/eval`   | WARN   | Required for Vite — trade-off                                              | Medium     |
| 8   | Rate limit default fail-open    | FAIL   | `rateLimit.server.ts:25` allows on error                                   | High       |
| 9   | Image moderation fail-open      | FAIL   | Returns safe on error                                                      | High       |
| 10  | SSRF protection on image proxy  | PASS   | Allow-list of hosts in `api/img.$.ts`                                      | None       |
| 11  | Service role used appropriately | WARN   | 139 usages — some may be unnecessary                                       | Medium     |
| 12  | VAPID private key secure        | PASS   | Server-side only, not in client bundle                                     | None       |
| 13  | OAuth state validation          | PASS   | Nonce, provider, expiry, one-shot checks                                   | None       |
| 14  | Push SW open redirect guard     | PASS   | Only allows internal paths                                                 | None       |
| 15  | HSTS enabled                    | PASS   | `Strict-Transport-Security` with preload                                   | None       |
| 16  | Legacy insecure cron removed    | PASS   | Migration `20260605194202` removes hardcoded key crons                     | None       |
| 17  | `dangerouslySetInnerHTML`       | PASS   | Not used anywhere                                                          | None       |
| 18  | Input validation                | PASS   | Zod schemas with max bounds on all text fields                             | None       |
| 19  | Storage policies                | PASS   | Scan photos locked to own folder                                           | None       |
| 20  | Hardcoded Supabase host in HTML | WARN   | Preconnect in `__root.tsx` exposes project ID                              | Low        |

**Security Score: 16/20 PASS, 2 WARN, 2 FAIL**

---

# BAGIAN 9 — PRIVACY MATRIX

| #   | Privacy Check                        | Status       | Evidence                                                                                                        | Risk Level |
| --- | ------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Privacy flags (6 flags)              | PASS         | `privacy.functions.ts` — public_profile, show_weight, show_meals, show_progress_photos, show_workouts, allow_dm | None       |
| 2   | UU PDP data export                   | PASS         | `pdpRights.functions.ts` exports 80+ tables                                                                     | None       |
| 3   | Account deletion                     | PASS         | Request + cancel deletion flow                                                                                  | None       |
| 4   | Profile masking for non-owners       | PASS         | `maskPublicProfile()` in `privacy.ts`                                                                           | None       |
| 5   | Privacy mask field whitelist         | FAIL         | When `public_profile=true`, all fields exposed                                                                  | High       |
| 6   | Offline queue health data TTL        | FAIL         | No expiry on IndexedDB health data                                                                              | High       |
| 7   | Leaderboard respects privacy         | CHECK NEEDED | `public_profile` flag should filter leaderboard                                                                 | Medium     |
| 8   | Social features respect privacy      | PASS         | `user_follows`, `meal_stories` check `public_profile`                                                           | None       |
| 9   | Health data in localStorage          | CHECK NEEDED | Need to verify no health data in localStorage                                                                   | Medium     |
| 10  | Service worker caches sensitive data | CHECK NEEDED | `push-sw.js` only handles push, no caching — OK                                                                 | Low        |
| 11  | Data retention policy                | FAIL         | No auto-delete for old data                                                                                     | Medium     |
| 12  | Sensitive notes encryption           | PASS         | `sensitiveNotes.functions.ts` uses Supabase RPC encryption                                                      | None       |
| 13  | Audit logging                        | PASS         | `logAudit` RPC for privacy changes                                                                              | None       |
| 14  | Profile visible to unauthenticated   | CHECK NEEDED | `maskPublicProfile` allows unauthenticated viewers when `public_profile=true`                                   | Medium     |

**Privacy Score: 8/14 PASS, 0 WARN, 3 FAIL, 3 CHECK NEEDED**

---

# BAGIAN 10 — AI SAFETY & COST AUDIT

## AI Architecture Overview

```
User Request
  → createServerFn + requireSupabaseAuth
  → checkRateLimit (per-feature buckets)
  → callAiWithGuards()
    → enforceAiBudget (per-user hourly/daily limits)
    → AbortController timeout (30s)
    → aiRouter.classifyMessage() (tier routing)
    → Tier 1: Local regex (no AI call)
    → Tier 2: gemini-2.5-flash (default)
    → Tier 3: gemini-2.5-pro (images, emergencies)
    → fetch(Lovable AI Gateway)
    → logAiUsage() (fire-and-forget)
    → aiCache (SHA-256 keys, TTL 24h/1h)
```

## AI Safety Checks

| #   | Check                              | Status                      | Evidence                                                 |
| --- | ---------------------------------- | --------------------------- | -------------------------------------------------------- |
| 1   | All AI calls through gateway       | PASS                        | No direct API calls found                                |
| 2   | AI not called "dokter"             | PASS                        | `chatSafety.ts` blocks diagnosis/prescription patterns   |
| 3   | Crisis detection                   | PASS                        | Self-harm keywords in ID/EN, returns crisis resources    |
| 4   | Medical disclaimers                | PASS                        | Appended for diagnosis, prescription, medical conditions |
| 5   | Dangerous behavior blocking        | PASS                        | Extreme fasting, purging patterns blocked                |
| 6   | Image moderation                   | PASS (with fail-open issue) | AI-based classification before storage                   |
| 7   | Budget enforcement                 | PASS                        | Per-user hourly/daily limits, auto-downgrade at 80%      |
| 8   | Rate limiting                      | PASS (with fail-open issue) | Per-feature buckets via Supabase RPC                     |
| 9   | Timeout on all AI calls            | PASS                        | AbortController 30s (non-stream) / 60s (stream)          |
| 10  | Response caching                   | PASS                        | SHA-256 keys, tiered TTL                                 |
| 11  | Tiered routing (cost optimization) | PASS                        | Local → Flash → Pro based on complexity                  |
| 12  | Input validation                   | PASS                        | Zod schemas, max bounds, MIME validation                 |
| 13  | Prompt injection guard             | WARN                        | `photoUrl` passed to AI prompt in `scanBatch7a`          |
| 14  | AI response sanitization           | PASS                        | `SafeMarkdown` with `rehype-sanitize`                    |

## AI Cost Analysis

| Tier   | Model            | Cost/1K tokens | Usage                              |
| ------ | ---------------- | -------------- | ---------------------------------- |
| Tier 1 | Local regex      | $0             | Greetings, BMI formula, water recs |
| Tier 2 | gemini-2.5-flash | ~$0.0001       | Default for most queries           |
| Tier 3 | gemini-2.5-pro   | ~$0.003        | Images, emergencies, complex       |

**Budget limits:**

- Free: 10 req/hour, 10K tokens/day
- Premium: 50 req/hour, 50K tokens/day

**Estimated monthly cost per active user:** $0.50-2.00 (heavy usage)

**Risk:** If rate limit is fail-open (P0-1), a single attacker could cost $50-100/hour in AI calls.

---

# BAGIAN 11 — SUPABASE DATABASE & RLS AUDIT

## Migration Summary

- **73 migration files** spanning June 3-6, 2026
- **80+ tables** covering: profiles, food, meals, fasting, water, chat, gamification, workouts, sleep, medications, community, groups, challenges, notifications, privacy, AI, content, referrals, recipes, and more

## RLS Policy Pattern

Every table follows this consistent pattern:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<name>" ON public.<table> FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

## Security Hardening Migrations

| Migration        | Action                                                       |
| ---------------- | ------------------------------------------------------------ |
| `20260603045402` | Revoke `handle_new_user()` EXECUTE from PUBLIC               |
| `20260603190647` | Fix insecure `notifications_log` INSERT (was `CHECK (true)`) |
| `20260605113135` | Bulk revoke SECURITY DEFINER EXECUTE from anon/PUBLIC        |
| `20260605194202` | Remove legacy cron jobs with hardcoded publishable key       |
| `20260606010618` | Final revoke of trigger function EXECUTE from public roles   |

## Issues Found

| #   | Issue                                     | Severity | Fix                                             |
| --- | ----------------------------------------- | -------- | ----------------------------------------------- |
| 1   | `service_role` granted ALL on every table | Expected | Verify service role key never exposed to client |
| 2   | Some tables may have overlapping policies | Low      | Audit for duplicate/conflicting policies        |
| 3   | No foreign key cascade deletes documented | Medium   | Add ON DELETE CASCADE where appropriate         |
| 4   | No index analysis for query performance   | Medium   | Run EXPLAIN on slow queries                     |

---

# BAGIAN 12 — TASTESKILL V2 DESIGN AUDIT

## Score Card

| Metric                             | Score  | Notes                                                                                                                         |
| ---------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **TasteSkill Visual Taste Score**  | 6.5/10 | Dashboard is card-heavy, some components feel template-like. Landing page has good Indonesian flavor but needs stronger hook. |
| **Anti-Slop UI Score**             | 6/10   | Generic patterns visible: card grids, standard shadcn components. Scan result and AI coach feel more unique.                  |
| **Health-Tech Trust Design Score** | 7.5/10 | Privacy flags, disclaimers, crisis resources. Trust indicators present but could be more visible.                             |
| **Mobile Polish Score**            | 7/10   | Good mobile-first with bottom nav, pull-to-refresh, swipe gestures. Some tap targets may be too small.                        |
| **Copywriting Taste Score**        | 7/10   | Indonesian copy is natural in most places. AI responses could feel more like "teman" not "robot".                             |

## Detailed Findings

### What Works Well (Anti-Slop)

1. **Indonesian food database** with local items (Nasi Putih, Rendang, Ayam Bakar) — authentic
2. **Prayer integration** (qibla, prayer reminders) — unique for Muslim Indonesian market
3. **Pet system & gacha** — gamification that's fun, not generic
4. **Meal stories** — social feature that's Instagram-like, familiar
5. **Crisis detection** with Indonesian keywords — culturally aware

### What Feels Generic (Slop Risk)

1. **Dashboard** — 20+ cards in a vertical list = wall of information
2. **Standard shadcn look** — needs more brand personality
3. **Loading states** — may be skeleton-only, needs personality
4. **Empty states** — may be generic "no data" messages
5. **AI coach tone** — needs to feel more like Indonesian "teman sehat", less like chatbot

### Recommendations

1. **Dashboard:** Progressive disclosure. Show top 3-5 cards, rest in "Lainnya" section
2. **Brand:** Add subtle Indonesian batik/nature patterns as accents
3. **Coach:** Custom tone guide for Indonesian health coaching style
4. **Empty states:** Friendly illustrations with actionable CTAs
5. **Microinteractions:** Confetti on achievements is good — add more (water fill animation, meal photo reveal)

---

# BAGIAN 13 — FILE-BY-FILE ANALYSIS

## Critical Files (Must Be Careful)

| File                                                    | Lines | Purpose                | Risk Level |
| ------------------------------------------------------- | ----- | ---------------------- | ---------- |
| `src/features/ai/lib/aiGateway.server.ts`               | 241   | Central AI gateway     | HIGH       |
| `src/lib/rateLimit.server.ts`                           | 38    | Rate limiting          | HIGH       |
| `src/lib/privacy.ts`                                    | 78    | Privacy masking        | HIGH       |
| `src/lib/offline-queue.ts`                              | 185   | Offline data sync      | HIGH       |
| `src/integrations/supabase/client.server.ts`            | 41    | Service role client    | HIGH       |
| `src/integrations/supabase/auth-middleware.ts`          | 73    | Auth middleware        | HIGH       |
| `src/server.ts`                                         | 98    | CF Workers entry + CSP | HIGH       |
| `src/start.ts`                                          | 76    | TanStack Start config  | MEDIUM     |
| `src/routes/__root.tsx`                                 | 193   | Root route             | MEDIUM     |
| `src/routes/_authenticated/route.tsx`                   | 32    | Auth guard             | HIGH       |
| `src/routes/api/chat.stream.ts`                         | 246   | Chat streaming         | HIGH       |
| `src/routes/api/img.$.ts`                               | 64    | Image proxy            | MEDIUM     |
| `src/features/chat/lib/chatSafety.ts`                   | 161   | Chat safety            | HIGH       |
| `src/features/moderation/lib/imageModeration.server.ts` | 65    | Image moderation       | HIGH       |
| `src/lib/cronAuth.server.ts`                            | 46    | Cron authentication    | HIGH       |
| `src/lib/validation.ts`                                 | 51    | Input validation       | MEDIUM     |
| `src/lib/userDataTables.ts`                             | 127   | PDP export tables      | MEDIUM     |
| `src/features/privacy/lib/pdpRights.functions.ts`       | 96    | UU PDP rights          | HIGH       |
| `public/push-sw.js`                                     | 42    | Push service worker    | MEDIUM     |
| `src/lib/push-config.ts`                                | 13    | VAPID config           | LOW        |

## Well-Structured Features (46 features)

| Feature       | Files | Quality                   | Notes                                  |
| ------------- | ----- | ------------------------- | -------------------------------------- |
| ai            | 6     | Excellent                 | Gateway, budget, cache, router, stream |
| scan          | 36    | Good but over-modularized | 15 batch files could be consolidated   |
| chat          | 7     | Excellent                 | Safety, prompts, context, streaming    |
| privacy       | 3     | Good                      | UU PDP compliance, flags, encryption   |
| dashboard     | 27    | Good                      | Rich components, but too many cards    |
| landing       | 12    | Good                      | Hero, sections, quiz, newsletter       |
| coach         | 1     | Minimal                   | Single functions file                  |
| notifications | 3     | Good                      | Push, preferences                      |
| gamification  | -     | Present                   | XP, achievements, streaks, gacha       |
| groups        | -     | Present                   | Social features                        |
| prayer        | -     | Present                   | Unique for Indonesian market           |
| pet           | -     | Present                   | Gamification companion                 |

---

# BAGIAN 14 — TECH DEBT INVENTORY

| #   | Debt                                      | Impact               | Effort to Fix    | Priority |
| --- | ----------------------------------------- | -------------------- | ---------------- | -------- |
| 1   | Scan module 36 files (over-modularized)   | Maintainability      | 2-3 days         | P2       |
| 2   | 139 `supabaseAdmin` usages                | Security surface     | 2-3 days audit   | P1       |
| 3   | No conventional commits                   | Traceability         | Ongoing          | P2       |
| 4   | No CI/CD pipeline                         | Quality assurance    | 1 day            | P1       |
| 5   | Only 8 E2E tests                          | Regression risk      | 2-3 days         | P1       |
| 6   | No integration tests for server functions | API reliability      | 3-5 days         | P2       |
| 7   | `noUnusedLocals: false`                   | Dead code            | 1 hour + cleanup | P3       |
| 8   | CSP `unsafe-inline/eval`                  | Security             | Large effort     | P3       |
| 9   | No data retention policy                  | Storage/compliance   | 1-2 days         | P1       |
| 10  | Dashboard wall-of-cards                   | UX                   | 1-2 days         | P2       |
| 11  | Newsletter form no-op                     | Feature completeness | 1 day            | P2       |
| 12  | No `.nvmrc`                               | DX                   | 5 min            | P3       |
| 13  | Client-side auth check (ssr: false)       | Security (minor)     | Medium effort    | P2       |
| 14  | Token estimation rough (÷4)               | Billing accuracy     | 2 hours          | P3       |

---

# BAGIAN 15 — TESTING ROADMAP

## Current State

- **Unit tests:** 42 files, 70% coverage threshold
- **E2E tests:** 8 smoke tests (Chromium + iPhone 13)
- **Test infra:** Vitest (jsdom) + Playwright

## Recommended Testing Phases

### Phase 1: Security Tests (1-2 days)

- Rate limit fail-closed behavior
- Offline queue TTL/expiry
- Image moderation fail-closed
- Privacy field whitelist
- Cron auth edge cases

### Phase 2: AI Integration Tests (2-3 days)

- AI gateway with mocked Lovable API
- Chat safety edge cases
- Budget enforcement at limits
- Cache hit/miss scenarios
- Tier routing logic

### Phase 3: Critical Path E2E (3-5 days)

- Login → Onboarding → Dashboard flow
- Scan photo → AI analysis → Save result
- Meal logging → Daily summary
- Chat with AI coach
- Privacy settings → Profile visibility

### Phase 4: Performance Tests (1-2 days)

- Lighthouse CI automation
- Bundle size regression tests
- API response time benchmarks

---

# BAGIAN 16 — KILO CODE IMPLEMENTATION ROADMAP

## Phase 1: P0 Security & Bug Fix (1-2 hari)

**Goal:** Fix all critical security issues

1. Fix rate limit fail-open → fail-closed
2. Add TTL to offline queue
3. Fix image moderation fail-open
4. Fix daily-coach notification preferences
5. Fix privacy mask field whitelist

## Phase 2: Privacy & Compliance (1-2 hari)

**Goal:** Strengthen health data privacy

1. Audit supabaseAdmin usage, replace with user-scoped where possible
2. Add data retention policy mechanism
3. Verify leaderboard respects privacy flags
4. Add logout cleanup for offline queue
5. Verify no health data in localStorage

## Phase 3: AI Safety & Cost Control (1-2 hari)

**Goal:** Ensure AI is safe and cost-controlled

1. Audit all AI callers for fail-closed
2. Add prompt injection guards for user-provided URLs
3. Verify all scan functions use rate limit
4. Test budget enforcement at limits
5. Document AI cost per feature

## Phase 4: Offline/PWA/Image Upload (2-3 hari)

**Goal:** Production-ready PWA

1. Add workbox service worker for offline caching
2. Image upload: verify MIME/size/EXIF validation
3. Add offline indicator UI
4. Test push notifications end-to-end
5. Verify manifest and icons

## Phase 5: TasteSkill UI/UX Polish (3-5 hari)

**Goal:** Anti-slop, Indonesia-authentic design

1. Dashboard progressive disclosure (show 5 cards, rest collapsible)
2. Add brand personality to loading/empty states
3. Coach tone guide (Indonesian "teman sehat" style)
4. Scan result trust indicators
5. Privacy/trust UI improvements
6. Microinteractions (water fill, meal reveal)

## Phase 6: Refactor & Maintainability (2-3 hari)

**Goal:** Clean codebase for long-term

1. Consolidate scan module (36 → ~15 files)
2. Add conventional commits
3. Enable `noUnusedLocals`
4. Clean up dead code
5. Document architecture

## Phase 7: Testing & Production Readiness (3-5 hari)

**Goal:** Confidence for public launch

1. Add security test suite
2. Add AI integration tests
3. Add critical path E2E tests
4. Set up CI/CD pipeline
5. Lighthouse CI automation
6. Performance benchmarks

## Phase 8: Wild Product Innovation (Ongoing)

**Goal:** Differentiate from competitors

1. See Wild Ideas section below

---

# BAGIAN 17 — COPY-PASTE PROMPTS FOR KILO CODE

## Prompt 1: Fix Rate Limit Fail-Open (Debug)

```
/fix-bug Rate limit di src/lib/rateLimit.server.ts baris 25 default-nya fail-open.
Saat Supabase RPC error, fungsi mengembalikan true (request diizinkan).
Ubah default jadi fail-closed (return false saat error).
Tambah parameter opts.failOpen = false sebagai default.
Pastikan semua caller yang butuh behavior fail-open explicitly pass opts.
Jalankan bun run test setelah edit.
```

## Prompt 2: Add TTL to Offline Queue (Code)

```
Mode: Code. Edit src/lib/offline-queue.ts.
Tambah field `expiresAt: number` pada queue item (default: Date.now() + 7 hari).
Tambah cleanupExpired() yang dipanggil saat enqueue dan flush.
Hapus item yang sudah expired dari queue dan dead-letter store.
Tambah test baru di src/lib/__tests__/offline-queue.test.ts untuk TTL behavior.
Jalankan bunx tsc --noEmit dan bun run test setelah edit.
```

## Prompt 3: Fix Image Moderation Fail-Open (Debug)

```
/fix-bug Image moderation di src/features/moderation/lib/imageModeration.server.ts
saat AI error mengembalikan { safe: true }. Ubah jadi { safe: false, reason: "moderation_error" }.
Tambah log error untuk monitoring.
Jalankan bun run test setelah edit.
```

## Prompt 4: Fix Daily Coach Notification Filter (Code)

```
Mode: Code. Edit src/routes/api/public/hooks/daily-coach.ts.
Query notification_preferences untuk filter user yang daily_coach = true.
Join push_subscriptions dengan notification_preferences berdasarkan user_id.
Hanya kirim push ke user yang daily_coach = true.
Jalankan bunx tsc --noEmit setelah edit.
```

## Prompt 5: Fix Privacy Mask Field Whitelist (Code)

```
Mode: Code. Edit src/lib/privacy.ts.
Tambah ALLOWED_PUBLIC_FIELDS = ['id', 'display_name', 'avatar_url', 'level', 'xp', 'streak_count'].
Saat public_profile = true, strip semua field yang tidak ada di whitelist.
Jangan expose email, health_conditions, allergies, medications, atau field sensitif lainnya.
Tambah test baru di src/lib/__tests__/privacy.test.ts.
Jalankan bunx tsc --noEmit dan bun run test setelah edit.
```

## Prompt 6: Audit supabaseAdmin Usage (Architect/Plan)

```
Mode: Architect / Plan. Jangan edit file.
Cari semua penggunaan supabaseAdmin di src/.
Untuk setiap file, tentukan apakah penggunaan service_role benar-benar diperlukan
atau bisa diganti dengan user-scoped client.
Buat laporan: file, baris, apakah perlu admin, alasan.
Prioritaskan yang berisiko tinggi (query user data dengan admin client).
```

## Prompt 7: Dashboard Progressive Disclosure (Code)

```
Mode: Code. Edit src/routes/_authenticated/dashboard.tsx.
Implementasi progressive disclosure: tampilkan 5 card terpenting secara default
(DashboardHeader, TodaysBalanceCard, HeroStatsRow, WaterCard, TodaysMeals).
Sisanya (20+ card) masukkan ke collapsible "Lainnya" section dengan button "Lihat Semua".
Gunakan komponen Collapsible dari shadcn/ui.
Pastikan mobile experience tetap bagus.
Jalankan bunx tsc --noEmit setelah edit.
```

## Prompt 8: Add CI/CD Pipeline (Code)

```
Mode: Code. Buat file .github/workflows/ci.yml.
Steps: checkout → bun install → bunx tsc --noEmit → bun run lint → bun run test → bun run build.
Trigger: push ke main/develop, pull request ke main.
Gunakan oven-sh/setup-bun@v2 untuk install Bun.
Tambah Lighthouse CI sebagai optional step.
```

## Prompt 9: Add Critical Path E2E Tests (Code)

```
Mode: Code. Edit e2e/ untuk tambah test baru.
Test 1: Login flow (email + password → dashboard)
Test 2: Scan flow (upload photo → view result)
Test 3: Meal logging (add meal → verify in dashboard)
Test 4: Chat interaction (send message → receive response)
Test 5: Privacy settings (toggle flags → verify effect)
Gunakan Playwright test pattern yang sudah ada.
Jalankan bun run e2e untuk verify.
```

## Prompt 10: Add Data Retention Policy (Architect/Plan)

```
Mode: Architect / Plan. Jangan edit file.
Rancang data retention policy untuk HealthyU:
- Tabel mana yang perlu auto-delete
- Berapa lama data disimpan
- Mekanisme implementasi (cron job vs trigger)
- Compliance dengan UU PDP
- User consent untuk data retention
Buat rencana implementasi bertahap.
```

## Prompt 11: Scan Module Consolidation (Architect/Plan)

```
Mode: Architect / Plan. Jangan edit file.
src/features/scan/lib/ punya 36 file, termasuk 15 batch files (scanBatch7-12b).
Analisis dependensi antar file dan buat rencana konsolidasi:
- File mana yang bisa digabung
- Berapa file ideal setelah konsolidasi
- Risiko perubahan
- Urutan refactor yang aman
```

## Prompt 12: Coach Tone Guide (Code)

```
Mode: Code. Edit src/features/chat/lib/chatPrompt.server.ts.
Tambah tone guide untuk AI coach:
- Gunakan bahasa Indonesia natural, ramah, seperti teman
- Jangan gunakan istilah medis tanpa penjelasan
- Selalu akhiri dengan pertanyaan atau encouragement
- Sebut user dengan "kamu" bukan "Anda"
- Gunakan emoji secukupnya (1-2 per pesan)
Jalankan bunx tsc --noEmit setelah edit.
```

## Prompt 13: Add Security Test Suite (Code)

```
Mode: Code. Buat test files baru:
1. src/lib/__tests__/rateLimit.failClosed.test.ts — test fail-closed behavior
2. src/lib/__tests__/offline-queue.ttl.test.ts — test TTL/expiry
3. src/features/moderation/__tests__/imageModeration.failClosed.test.ts — test fail-closed
4. src/lib/__tests__/privacy.fieldWhitelist.test.ts — test field whitelist
Gunakan vitest pattern yang sudah ada.
Jalankan bun run test untuk verify semua pass.
```

## Prompt 14: Newsletter Form Wire-Up (Code)

```
Mode: Code. Edit landing page newsletter component.
Simpan email ke tabel newsletter_subscribers di Supabase.
Tambah server function createServerFn dengan validasi email.
Handle duplicate email (update subscribed_at).
Tampilkan toast sukses/error.
Jalankan bunx tsc --noEmit setelah edit.
```

## Prompt 15: Full Audit Verification (Architect/Plan)

```
Mode: Architect / Plan. Jangan edit file.
Setelah semua P0 fix diimplementasikan, jalankan audit verifikasi:
1. bunx tsc — pastikan 0 error
2. bun run lint — pastikan 0 error
3. bun run test — pastikan semua pass
4. bun run build — pastikan build sukses
5. Review semua file yang diubah
6. Verify tidak ada regression
7. Buat laporan final status P0 issues
```

## Prompt 16: Logout Cleanup (Code)

```
Mode: Code. Edit src/routes/_authenticated/ (logout handler).
Saat user logout, panggil offlineQueue.clearAll() untuk hapus data kesehatan dari IndexedDB.
Pastikan juga clear localStorage/sessionStorage data yang sensitif.
Redirect ke /auth setelah cleanup selesai.
Jalankan bunx tsc --noEmit setelah edit.
```

## Prompt 17: Convention Commits Setup (Code)

```
Mode: Code. Buat .github/COMMIT_CONVENTION.md dengan panduan commit message:
feat:, fix:, security:, refactor:, test:, docs:, style:, chore:, perf:
Tambah contoh untuk masing-masing prefix.
Opsional: tambah commitlint config jika diperlukan.
```

## Prompt 18: Brand Identity Enhancement (Code)

```
Mode: Code. Edit src/styles.css dan tailwind config.
Tambah brand colors yang lebih personal:
- Primary: hijau alam Indonesia (#6B8E5A sudah bagus)
- Accent: warm earth tone
- Custom font pairing (misal Plus Jakarta Sans untuk heading)
Tambah subtle pattern/texture sebagai CSS utility class.
Pastikan tidak mengubah existing component colors secara drastis.
Jalankan bunx tsc --noEmit setelah edit.
```

## Prompt 19: Empty States Personality (Code)

```
Mode: Code. Edit dashboard components yang punya empty state.
Ganti generic "no data" dengan:
- Ilustrasi/icon yang relevan
- Copy bahasa Indonesia yang ramah
- CTA action yang jelas
Contoh: "Kamu belum makan hari ini 😅 Yuk mulai catat makanan pertama!"
Tambah di: TodaysMeals, WaterCard, MoodQuickLog, WorkoutCard.
Jalankan bunx tsc --noEmit setelah edit.
```

## Prompt 20: Lighthouse CI Automation (Code)

```
Mode: Code. Edit .github/workflows/ untuk tambah Lighthouse CI step.
Gunakan treosh/lighthouse-ci-action@v12.
Assert: accessibility 0.9 (error), performance 0.7 (warn), SEO 0.9 (warn).
Upload results ke temporary-public-storage.
Jalankan di PR ke main.
```

---

# BAGIAN 18 — PRODUCT STRATEGY

## Current State

- **46 features** — sangat ambitious untuk MVP
- **Core loop:** Scan → Track → Coach → Improve
- **Unique:** Prayer integration, pet system, Indonesian food database, meal stories

## Target Market

- **Indonesian millennials/Gen-Z** yang sadar kesehatan
- **Muslim community** yang butuh prayer + fasting integration
- **Budget-conscious** yang mau makan sehat tanpa mahal

## Competitive Advantage

1. **Indonesian-first** — bukan terjemahan app Barat
2. **AI-powered** — scan makanan lokal, coach bahasa Indonesia
3. **Culturally aware** — puasa, qibla, makanan lokal
4. **Gamifikasi** — pet, gacha, streak, achievements
5. **Social** — meal stories, family plans, groups

## Recommended MVP Feature Set (Launch with these only)

### Core (Wajib)

1. ✅ Auth (email + OAuth)
2. ✅ Onboarding
3. ✅ Dashboard (simplified)
4. ✅ Food scan (AI)
5. ✅ Meal logging
6. ✅ Water tracking
7. ✅ AI chat/coach
8. ✅ Profile + privacy settings

### Nice-to-Have (Launch tanpa ini oke)

- Fasting timer
- Workout logging
- Mood tracking
- Gamification (XP, streak)
- Push notifications
- Articles/recipes

### Bisa Ditunda

- Meal stories
- Family plans
- Groups/challenges
- Pet system
- Gacha
- Google Fit integration
- Barcode scanner
- PDF export
- Prayer integration

## Revenue Model Ideas

1. **Freemium** — Free tier (10 AI calls/day) → Premium (unlimited)
2. **AI Coach Premium** — Deep personalized coaching
3. **Meal Plan Premium** — Weekly AI-generated meal plans
4. **Family Plan** — Multi-user family dashboard
5. **B2B Corporate Wellness** — Employee health programs

---

# BAGIAN 19 — WILD IDEAS (25+)

## Health & AI Innovation

1. **AI Tukang Sayur** — Foto pasar tradisional, AI identifikasi sayuran dan harga pasar
2. **Resep dari Kulkas** — Foto isi kulkas, AI buat resep dari bahan yang ada
3. **Nutrisi Warung** — Database khusus warung/kaki lima Indonesia dengan estimasi kalori
4. **Puasa Coach** — AI khusus untuk Ramadan, atur sahur/buka/sahur cycle
5. **Ibu Hamil Mode** — Tracking kebutuhan nutrisi ibu hamil dengan aman
6. **Diabetes Friend** — Mode khusus diabetes dengan GI tracking untuk makanan Indonesia

## Gamifikasi & Social

7. **HealthyU Points Economy** — Points bisa ditukar voucher sehat (salad bar, gym, dll)
8. **Makan Bareng** — Sync meal logging dengan teman/keluarga untuk accountability
9. **Challenge Komunitas RT** — Healthy competition antar RT/RW
10. **Food Photo Contest** — Weekly contest foto makanan sehat terbaik
11. **Streak Leaderboard** — Siapa yang paling konsisten di komunitas

## Integration & Ecosystem

12. **GoFood/GrabFood Scanner** — Scan menu GoFood/GrabFood untuk analisis nutrisi
13. **Smartwatch Deep Integration** — Real-time heart rate, sleep, SpO2 dari smartwatch lokal
14. **Tokopedia/Shopee Cart Analyzer** — Analisis keranjang belanja untuk rekomendasi sehat
15. **BPJS Integration** — Integrasi data kesehatan dari BPJS (dengan consent)
16. **Halal Scanner** — Verifikasi halal dari barcode + database MUI

## Content & Education

17. **AI Podcast Harian** — 2 menit podcast harian tentang tips kesehatan Indonesia
18. **Video Pendek Edukasi** — 30 detik video tips sehat (TikTok style)
19. **Myth Buster** — AI debunk mitos kesehatan Indonesia (misal: "makan nasi malam bikin gemuk")
20. **Dokter Chat** — Verified dokter Indonesia untuk second opinion (premium)

## Data & Insights

21. **Prediksi Kesehatan** — AI prediksi risiko kesehatan berdasarkan pola makan
22. **City Health Index** — Perbandingan pola makan antar kota Indonesia
23. **Seasonal Eating Guide** — Rekomendasi makanan berdasarkan musim/panen Indonesia
24. **Budget Meal Planner** — Meal plan berdasarkan budget harian (Rp 20rb, 30rb, 50rb)
25. **Nutrisi Anak** — Tracking untuk anak-anak dengan resep MPASI

## Wild Tech

26. **AR Food Scanner** — Arahkan kamera ke makanan, langsung tampil info nutrisi di AR
27. **Voice Logging** — "Tadi makan nasi goreng satu piring" → auto log
28. **Smart Scale Integration** — Timbangan Bluetooth → auto-update body metrics
29. **AI Shopping List** — Dari meal plan, auto-generate belanjaan dengan harga estimasi
30. **Health Score NFT** — Achievement NFT untuk milestone kesehatan (optional, web3 curious)

---

# BAGIAN 20 — FINAL VERDICT

## Apakah project boleh launch sekarang?

**TIDAK.** Ada 5 P0 issues yang harus di-fix dulu. Setelah fix, bisa launch sebagai beta.

## 5 Syarat Beta Launch

1. ✅ Fix rate limit fail-open → fail-closed
2. ✅ Fix offline queue TTL/expiry
3. ✅ Fix image moderation fail-closed
4. ✅ Fix daily-coach notification filter
5. ✅ `bunx tsc --noEmit` + `bun run test` + `bun run build` semua pass

**Estimasi waktu:** 1-2 hari kerja

## 5 Syarat Public Launch

1. ✅ Semua P0 dan P1 issues resolved
2. ✅ CI/CD pipeline aktif
3. ✅ Critical path E2E tests (login, scan, meal, chat)
4. ✅ Dashboard progressive disclosure (tidak wall-of-cards)
5. ✅ Data retention policy implemented

**Estimasi waktu:** 2-3 minggu setelah beta

## Risiko Terbesar

**AI cost explosion** jika rate limit fail-open dan seseorang spam AI calls. Dengan fail-open default, single attacker bisa habiskan $50-100/jam.

## Next Move Paling Cerdas

1. **Hari ini:** Buat branch `security/hardening`, fix 5 P0 issues (1-2 hari)
2. **Minggu ini:** Deploy beta ke Lovable Cloud, test dengan 5-10 user Indonesia
3. **Minggu depan:** Collect feedback, fix P1 issues, tambah E2E tests
4. **Bulan ini:** Public beta launch dengan 100-500 users

---

# LAMPIRAN: LOVABLE PLAN.MD CROSS-REFERENCE

File `.lovable/plan.md` sudah berisi TasteSkill audit dengan 6 critical, 10 high, dan 10 medium issues. Beberapa overlap dengan temuan di audit ini:

| Lovable Plan Issue               | Audit Finding               | Status          |
| -------------------------------- | --------------------------- | --------------- |
| Dashboard wall-of-cards          | P1-6                        | Confirmed       |
| Inconsistent AI safety microcopy | Covered in chatSafety       | OK              |
| No medical disclaimer on scan    | chatSafety adds disclaimers | Partially fixed |
| Fasting safety friction          | Needs review                | Pending         |
| Scan CTA promises certainty      | Needs review                | Pending         |
| Missing empty/error states       | P2 item                     | Pending         |

---

_Plan generated by Kilo Code audit. Ready for implementation after user approval._
