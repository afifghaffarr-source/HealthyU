# Rencana — HealthyU AI Cost Optimization

Tujuan: hemat 80–90% biaya AI tanpa menurunkan UX. Implementasi dibagi 4 batch agar bisa dieksekusi bertahap. Saya akan jalankan **Batch 1 dulu**, lalu lanjut atas perintah `lanjut`.

---

## Batch 1 — Smart Routing + Response Cache (chatbot)

Dampak terbesar (~50% saving). Sentuh `src/lib/chat.functions.ts` & `src/routes/api/chat.stream.ts`.

1. Tambah `src/lib/aiRouter.server.ts`:
   - `classifyMessage(text, hasImage)` → return `{ tier: 1|2|3, reason, model }`
   - Level 1: regex kalori/BMI/air/streak → jawab tanpa AI (handler langsung di chat.functions).
   - Level 2: default `google/gemini-3-flash-preview` (sudah dipakai) untuk pertanyaan ringan.
   - Level 3: `google/gemini-2.5-pro` untuk emergency keywords, foto, atau ≥30 kata + ≥2 metric kompleks.
2. Tambah `src/lib/aiCache.server.ts`:
   - Tabel baru `ai_response_cache(key text pk, response text, model text, hit_count int, created_at, expires_at)`.
   - Key = `sha256(model + tier + normalize(question) + profileHash)`.
   - TTL 24 jam (factual) / 1 jam (personal). Lookup sebelum panggil gateway; insert sesudahnya.
3. Compressed system prompt: ringkas profile dari ±800 token → ±200 token format `Budi|M30|80kg|170cm|BMI27.6→70kg|mod|alergi:kacang|diabetes2|lowcarb|1800kal`.
4. Output cap: untuk tier 1/2 tambahkan `max_tokens: 350` dan instruksi "jawab maksimal 3 kalimat / 5 bullet".

## Batch 2 — Local-first calculators + on-device guard

- Audit semua serverFn AI: `vitals/bodyMetrics/water/sleep/fasting/prayerTimes` → pastikan hanya rumus lokal/DB lookup, tidak panggil gateway.
- Tambah util `src/lib/localCalc.ts` (BMR Mifflin, TDEE, macros, water target, health score weighted) dipakai konsisten di UI & server.
- Food search: pastikan `foodDb.functions.ts` query Postgres (full-text) dulu sebelum fallback ke `foodScan` AI.

## Batch 3 — Batch & Precompute

- `daily_tips_pool(id, category, tags[], text)` — seed 200 tips via 1 batch job (`scripts/seed-tips.ts` dijalankan sekali). Runtime pilih tip via `pick by profile`, **0 AI call**.
- Weekly report: cron sudah ada (`weekly-ai-report.ts`). Tambahkan early-skip jika user inactive 7 hari; gunakan `gemini-3-flash-preview` (sudah) + compressed input.
- Meal plan free tier: pre-built templates di `meal_plan_templates`, AI generate hanya untuk premium.

## Batch 4 — Cost Monitoring + Hard Limits

- Tabel `ai_usage_logs(user_id, tier, model, input_tokens, output_tokens, cost_estimate_usd, cache_hit, feature, created_at)`.
- Middleware `enforceAiBudget(userId, tier)`:
  - Free: 10 req/jam, 10k token/hari → kalau hampir limit, force tier 2; kalau over, return 429 dengan pesan ramah.
  - Premium: 50 req/jam, 50k token/hari.
- View `ai_cost_daily` untuk admin. Tidak buat UI dashboard (di luar scope, bisa minta nanti).

---

## Catatan teknis

- Tidak ada Edge Function — semua di TanStack server fn / server route (sesuai stack).
- Cache & usage log pakai tabel Supabase (bukan Redis) supaya tanpa infra tambahan. Aman untuk skala awal; bila perlu ganti Redis nanti.
- "Embedding semantic cache" (Layer 2) di-skip dulu — butuh pgvector + biaya embedding, akan dievaluasi setelah Batch 1 jalan & data hit-rate kelihatan.
- Rate limit murni di-app (DB counter) — backend tidak punya primitif rate-limit standar.

Mulai dengan **Batch 1**?
