# HealthyU Production Hardening — Rencana Eksekusi

Rencana ini memecah audit jadi **8 batch kecil**. Tiap batch berdiri sendiri, bisa direview & rollback tanpa merusak fitur lain. Saya kerjakan satu batch per perintah `lanjut`. Tidak ada rewrite total, tidak ada penghapusan fitur, tidak ada migration destruktif.

---

## P0 — Wajib (Batch H1–H5)

### Batch H1 — Package manager & dependency
- Pilih **Bun** sebagai single PM (sesuai environment Lovable).
- Hapus `package-lock.json`. Pertahankan `bun.lock`.
- Tambah `packageManager` + `engines` di `package.json`.
- Selaraskan `@zxing/browser` & `@zxing/library` (pin versi yang kompatibel).
- Verifikasi script `build`, `lint`, `test` masih jalan.

### Batch H2 — Cron/hook auth + env hygiene
- Buat `src/lib/cronAuth.server.ts` (`requireCronSecret`).
- Migrasi 5 route `src/routes/api/public/hooks/*` dari `SUPABASE_PUBLISHABLE_KEY` → `CRON_SECRET` (`x-cron-secret` / `Authorization: Bearer`). Fail-closed kalau secret kosong.
- Minta secret `CRON_SECRET` via `add_secret` (kalau belum ada).
- Update `.gitignore` (`.env`, `.env.*`, `!.env.example`) & buat `.env.example` placeholder.

### Batch H3 — Google Fit OAuth state
- Migration: tabel `oauth_states (user_id, provider, nonce unique, expires_at, used_at)` + RLS service-role only.
- Update entry-point OAuth (start) untuk generate nonce + simpan.
- Update `wearable.google-fit.callback.ts`: validasi nonce, provider, expiry, mark used; tolak state mentah.

### Batch H4 — Sanitasi markdown artikel
- `bun add react-markdown remark-gfm rehype-sanitize`.
- Ganti `renderMarkdown` + `dangerouslySetInnerHTML` di `artikel.$slug.tsx` dengan `<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>`.
- Pastikan styling Prose tetap.

### Batch H5 — AI Gateway tersentralisasi
- Buat `src/lib/aiGateway.server.ts` dengan `callAiWithGuards({ userId, feature, messages, model?, ... })`: rate-limit (pakai `aiBudget`/`aiCache` yg sudah ada), timeout, safe-parse, log minimal, fail-closed.
- Refactor `chat.functions.ts`, `chat.stream.ts`, `foodScan.functions.ts`, `reports.functions.ts`, `recommendations.functions.ts`, `scanBatch7..12.functions.ts` agar lewat helper.
- `LOVABLE_API_KEY` hanya dibaca di helper.

---

## P1 — Refactor Penting (Batch H6)

### Batch H6 — Data model & PDP/export
- Buat `src/lib/userDataTables.ts` (konstanta tabel user real: `meal_logs`, `water_logs`, `workout_sessions`, `vitals_logs`, `food_scans`, `fasting_sessions`, `sleep_sessions`, `chat_messages`, dll).
- Refactor `pdpRights.functions.ts` & `export.functions.ts` pakai konstanta, selalu filter `user_id`.
- Audit nama kolom (duration_minutes/duration_min, started_at/performed_at, sleep_logs/sleep_sessions, vitals/vitals_logs) — perbaiki query yang mismatch via grep + check `types.ts`.

> Refactor struktur `src/features/*` (item #8) dan pecah route besar (#9) **DITUNDA** ke iterasi berikutnya — risiko regresi terlalu besar untuk dilakukan bersamaan dengan H1–H6. Akan saya catat sebagai TODO terpisah.

---

## P1.5 — Branding & Validation (Batch H7)

### Batch H7 — Config app + Zod everywhere
- Buat `src/config/app.ts` (appName, canonicalUrl, OG image, dll).
- Sapu sisa "Sehatify"/"Lovable" → HealthyU di root meta, manifest, push, SEO.
- Audit semua `createServerFn({ method: "POST" })` — tambah `.inputValidator(z.object({}).strict())` di yang belum punya.

---

## P2 — CI, Test, Docs (Batch H8)

### Batch H8 — CI + test + README
- Update `.github/workflows/` jadi `install → typecheck → lint → test → build` (Bun).
- Tambah Vitest minimal untuk: `requireCronSecret`, `callAiWithGuards` (rate-limit branch), OAuth state validator, PDP table mapping, markdown sanitization.
- Buat `README.md` root: stack, install, env, Supabase, AI gateway, CRON_SECRET, deploy, test, known limits.

---

## Catatan teknis

- Tiap batch berakhir dengan summary: file diubah, security issue diperbaiki, dependency change, sisa risiko.
- Tidak ada migration destruktif. Tabel baru (`oauth_states`) RLS service-role only.
- Jika `CRON_SECRET` belum ada, di Batch H2 saya minta lewat `add_secret`; tidak commit nilai apapun.
- Item #8 (folder `features/`) & #9 (pecah route besar) sengaja ditunda — dampak luas, tidak P0, lebih baik setelah test base ada (H8).

Mulai dari **Batch H1**?