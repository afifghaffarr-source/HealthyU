# Risk Matrix — HealthyU Audit

> **Snapshot:** 2026-06-15
> **Klasifikasi:** Dampak (Low/Medium/High/Critical) × Kemungkinan (Low/Medium/High)
> **Urut:** Critical → Low (Dampak × Kemungkinan × Confidence)

## 1. Heatmap (visual)

```
                  KEMUNGKINAN
              Low      Medium     High
DAMPAK  ┌──────────────────────────────────┐
Critical│  –          –         AUDIT-001  │
        │                                   │
High    │  AUDIT-005  AUDIT-002  AUDIT-004  │
        │             AUDIT-003            │
        │                                   │
Medium  │  AUDIT-011  AUDIT-006  AUDIT-008  │
        │  AUDIT-012  AUDIT-007  AUDIT-009  │
        │              AUDIT-010           │
        │                                   │
Low     │  AUDIT-016  AUDIT-013  –         │
        │              AUDIT-014           │
        │              AUDIT-015           │
        └──────────────────────────────────┘
```

## 2. Detail Tabel

| ID            | Prioritas   | Masalah                                       | Lokasi                                          | Dampak   | Kemungkinan | Confidence | Rekomendasi                                 | Effort |
| ------------- | ----------- | --------------------------------------------- | ----------------------------------------------- | -------- | ----------- | ---------- | ------------------------------------------- | ------ |
| **AUDIT-001** | Critical    | React Hooks rules violated                    | `src/components/bottom-nav.tsx:23-25`           | Critical | High        | High       | Refactor: hooks sebelum early-return        | S      |
| **AUDIT-004** | High        | Bundle 758KB + scan 437KB di main chunk       | `dist/client/assets/index-*.js`                 | High     | High        | High       | Lazy load scan routes, dynamic import jspdf | M      |
| **AUDIT-002** | High        | 9 empty catch blocks (silent failure)         | 9 file (useSpeech, scan\*.functions)            | High     | High        | High       | Tambah `console.error`/logger               | S–M    |
| **AUDIT-003** | High        | `any` di route auth                           | `restaurants.nearby.tsx:14`                     | High     | High        | High       | Replace `any` dengan `unknown` + Zod        | XS     |
| **AUDIT-005** | High        | `bun run lint` exit 1, CI mungkin tidak gate  | `bun run lint` output                           | High     | Medium      | High       | Verify + tambah `lint` ke CI matrix         | S      |
| **AUDIT-008** | Medium      | 168 `as any`/`@ts-ignore` tersebar            | 609 file grep                                   | Medium   | High        | High       | Audit per-file batch                        | L      |
| **AUDIT-006** | Medium      | Fast Refresh degraded 18 file                 | 18 file (button, form, badge)                   | Medium   | High        | High       | Extract helper/constant                     | M      |
| **AUDIT-009** | Medium      | Server bundle 9.8MB, possible leak            | `dist/server/`                                  | Medium   | High        | Medium     | Audit top-5 chunks, verify isolation        | M      |
| **AUDIT-010** | Medium      | 11 `console.log` di `.server.ts`              | 11 lokasi                                       | Medium   | High        | High       | Ganti ke `logger.server.ts`                 | XS     |
| **AUDIT-007** | Medium      | useMemo dep array unstable                    | `articles.tsx:37-47`                            | Medium   | High        | High       | Wrap ekspresi di useMemo sendiri            | XS     |
| **AUDIT-011** | Low         | Prettier violation di postbuild-fix.mjs       | `scripts/postbuild-fix.mjs:54`                  | Low      | High        | High       | `npx prettier --write`                      | XS     |
| **AUDIT-012** | Low         | chatSafety keyword list statis                | `chatSafety.ts:14-121`                          | Low      | Medium      | High       | Quarterly review                            | S      |
| **AUDIT-013** | Improvement | `vexoAdapter.ts` bukan `.server.ts`           | `src/features/ai/lib/vexoAdapter.ts`            | Low      | Medium      | High       | Rename + update barrel                      | XS     |
| **AUDIT-014** | Improvement | `*.functions.ts` convention tanpa enforcement | 25+ file                                        | Low      | Medium      | High       | Audit import chain, atau tambah eslint      | S      |
| **AUDIT-015** | Improvement | `cloudflare-env.server` 716KB chunk           | `dist/server/assets/cloudflare-env.server-*.js` | Low      | Medium      | Medium     | **Verify tree-shake**, atau split           | M      |
| **AUDIT-016** | Improvement | Beberapa API routes tanpa test                | `chat.stream.ts`, `health.ts`                   | Low      | Medium      | Medium     | Tambah integration test                     | S      |

## 3. Top-5 Prioritas Eksekusi (untuk Fix Strategy)

1. **AUDIT-001** (Critical) — Fix React Hooks di `bottom-nav.tsx`. ~30 menit.
2. **AUDIT-002** (High) — Tambah logging ke 9 empty catch. ~2-3 jam.
3. **AUDIT-003 + AUDIT-011** (High/Low) — Replace `any`, prettier. ~1 jam.
4. **AUDIT-005** (High) — Verify CI gates lint. ~1 jam.
5. **AUDIT-004** (High) — Lazy load scan routes + jspdf. ~3-4 jam.

Total: ~1 hari kerja. Setelah ini, semua Critical + High **harus** clear.

## 4. Watch List (Potential Future Risk)

- `*.functions.ts` pattern (AUDIT-014): jika di-break dengan import salah dari client, `getEnv()` akan return `undefined` di browser → silent failure di production. Saat ini aman (sudah verified import chain), tapi risk manusia.
- `cloudflare-env.server` chunk (AUDIT-015): kalau future refactor break tree-shake → RLS bypass. Wajib CI check.
- 168 `as any` (AUDIT-008): dalam 6 bulan, kalau tidak di-address, akan jadi "by design" anti-pattern.
- Bundle size (AUDIT-004, AUDIT-009): kalau fitur baru ditambah tanpa code split, bundle akan terus membengkak.

## 5. Risk Matrix Asumsi

- Dampak "Critical" = ada potensi data loss / security breach / production down
- Kemungkinan "High" = sudah terbukti dari kode/static analysis
- Kemungkinan "Medium" = indikasi kuat, butuh runtime test untuk konfirmasi
- Kemungkinan "Low" = edge case, baru terjadi dalam kondisi tertentu
- Confidence "High" = bukti langsung + paham konteks
