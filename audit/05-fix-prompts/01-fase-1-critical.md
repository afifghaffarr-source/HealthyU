# Fix Prompt — Fase 1: Critical Stabilization

> **Status: ✅ COMPLETE 2026-06-15** — branch `fix/audit-fase-1-critical` pushed.
> 4 commit: f14f49d3, 752ff833, 8f9bae4b, 04463609.
> All static gates green: tsc 0, lint 0 errors, tests 336/336, build 26s.
>
> Prompt di bawah ini adalah salinan asli yang dipakai. Digunakan sebagai template untuk Fase 2.

---

## Copy-Paste Prompt

```
Tugas: Eksekusi Fase 1 dari audit HealthyU.

# Konteks
Kamu adalah senior engineer接手 project HealthyU di ~/projects/HealthyU.
Audit lengkap di audit/01-findings.md, audit/02-risk-matrix.md, audit/04-roadmap.md.
Bukti mentah di audit/07-command-output/.

# Constraints (WAJIB patuh, dari AGENTS.md)
1. Perubahan kecil & bertahap (satu PR = satu cluster ≤ 500 LOC diff).
2. Tidak rewrite, tidak hapus fitur.
3. Tidak edit .env.
4. Tidak hardcode secret/key.
5. Tidak pakai dangerouslySetInnerHTML tanpa sanitizer.
6. AI call wajib lewat aiGateway.server.ts.
7. Cron wajib pakai CRON_SECRET.
8. Privacy flags dihormati.
9. Tidak tambah dependency besar.
10. Jelaskan setiap file yang diubah: alasan, risiko, cara test.

# Branch
Buat branch: fix/audit-fase-1-critical
Bash perubahan dari main (HEAD = 008dd1dc).

# Findings yang harus diperbaiki (urut)

## 1. AUDIT-001 (CRITICAL) — React Hooks rules violated
File: src/components/bottom-nav.tsx (lines 23-25)
Bukti: `bun run lint` output:
  23:37  error  React Hook "useOfflineQueue" is called conditionally
  24:23  error  React Hook "useServerFn" is called conditionally
  25:27  error  React Hook "useQuery" is called conditionally

TUGAS:
- Baca src/components/bottom-nav.tsx full.
- Identifikasi early-return atau conditional branch sebelum hook calls.
- Refactor: pindahkan SEMUA hook calls ke awal function, sebelum early return.
- Jika ada kondisi yang membungkus hook, ubah struktur logic (bukan bungkus hook dengan if).

VERIFIKASI:
- bun run lint → 0 errors untuk bottom-nav.tsx
- bunx tsc --noEmit → 0 errors
- bun run test → 336/336

## 2. AUDIT-002 (HIGH) — 9 empty catch blocks
Lokasi (dari lint):
  - src/features/chat/hooks/useSpeech.ts:47,50,63,77,124,130
  - src/features/scan/lib/scanContent.functions.ts:158
  - src/features/scan/lib/scanMeal.functions.ts:231
  - src/features/scan/lib/scanMisc.functions.ts:71,473
  - src/features/scan/lib/scanPlan.functions.ts:222
  - src/routes/_authenticated/articles.$id.tsx:68
  - src/routes/_authenticated/workout.player.$id.tsx:31

TUGAS (per lokasi):
- Baca file, identifikasi try/catch pattern.
- Tambah minimal console.error atau logger.server.ts call di catch block.
- Untuk client: import logger/errorReporting yang ada, jangan tambah dependency baru.
- Untuk server: import logger.server.ts yang ada, jangan tambah dependency baru.

CONTOH (untuk useSpeech.ts):
  try { ... } catch (e) { /* empty */ }
  // →
  try { ... } catch (e) {
    console.error('[useSpeech] recognition error', e);
    // atau:
    import('@/lib/errorReporting').then(({ reportClientError }) =>
      reportClientError(e, { boundary: 'useSpeech' })
    );
  }

VERIFIKASI:
- bun run lint → 0 no-empty errors
- bun run test → 336/336

## 3. AUDIT-003 (HIGH) — any type di restaurants.nearby.tsx:14
File: src/routes/_authenticated/restaurants.nearby.tsx

TUGAS:
- Baca file, identifikasi penggunaan any di line 14.
- Ganti any dengan unknown + Zod parse, atau type eksplisit dari integrations/supabase/types.ts.
- Jika perlu Zod schema baru, tambah di file yang sama atau di lib/ sesuai konvensi project.

VERIFIKASI:
- bun run lint → 0 no-explicit-any errors
- bunx tsc --noEmit → 0 errors

## 4. AUDIT-011 (LOW) — Prettier di postbuild-fix.mjs
File: scripts/postbuild-fix.mjs:54

TUGAS:
- Jalankan: npx prettier --write scripts/postbuild-fix.mjs
- ATAU tambah // prettier-ignore di line tersebut dengan komentar mengapa.
- ATAU exclude scripts/ dari prettier config (.prettierignore).

PILIH: prettier-ignore + komentar (least invasive).

VERIFIKASI:
- bun run lint → 0 prettier errors

# Acceptance Criteria (semua harus pass)
- [ ] bunx tsc --noEmit → 0 errors
- [ ] bun run lint → 0 errors (target), atau maximum 2 prettier warnings yang di-ignore eksplisit
- [ ] bun run test → 336/336 (no regression)
- [ ] bun run build → sukses
- [ ] Tidak ada console.log baru yang ditambahkan (kecuali untuk empty catch logging)

# Commit & Push
Buat 4 commit terpisah (1 per finding) untuk clear history:
  chore(audit-001): fix React Hooks conditional call di bottom-nav
  chore(audit-002): add error logging ke 9 empty catch blocks
  chore(audit-003): replace any dengan proper type di restaurants.nearby
  chore(audit-004): prettier-ignore postbuild-fix.mjs line 54

Push ke origin:fix/audit-fase-1-critical. BUKAN main.

# Setelah Selesai
- Update audit/01-findings.md: status AUDIT-001..011 jadi RESOLVED dengan commit SHA.
- Lapor balik dengan ringkasan: jumlah error yang diperbaiki, file yang disentuh, test results.

# Definisi Selesai
Fase 1 selesai jika:
- 4 commit sudah pushed ke fix/audit-fase-1-critical
- Semua acceptance criteria pass
- audit/01-findings.md updated
- Lapor balik dikirim dengan format: progress + blockers (jika ada) + next step (Fase 2)
```

---

## Catatan Auditor

- **Bottom-nav adalah navigation utama** — perubahan di sini affect semua route authenticated. Test manual mobile + desktop WAJIB.
- **Empty catch blocks**: prioritaskan yang **di server** (`.server.ts`, `.functions.ts`, `routes/api/**`) karena impact ke error reporting lebih besar.
- **Type any**: ini cluster kecil, bisa selesai cepat.
- **Prettier**: trivial, jangan overthink.

## Risiko & Mitigasi

| Risiko                           | Mitigasi                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------- |
| Bottom-nav refactor break layout | Manual QA di mobile + desktop, screenshot before/after                           |
| Empty catch logging spam console | Set log level di production, atau gunakan `logger.server.ts` dengan level filter |
| Prettier-ignore jadi tech debt   | Tambah TODO dengan reminder di masa depan                                        |
