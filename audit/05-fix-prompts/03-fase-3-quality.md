# Fix Prompt — Fase 3: Core Quality & Bug Fixing

> **Untuk di-copy-paste.**
> **Scope:** AUDIT-004 (bundle), 006 (fast-refresh), 007 (useMemo), 008 (`as any` top 30).
> **Risiko:** Medium-High (bundle + refactor).
> **Target branch:** `fix/audit-fase-3-quality` (setelah Fase 2 merged).

---

## Copy-Paste Prompt

```
Tugas: Eksekusi Fase 3 dari audit HealthyU.

# Konteks
HealthyU di ~/projects/HealthyU. Audit di audit/01-findings.md. Fase 1 + 2 sudah merged.
AGENTS.md rule tetap berlaku.

# Branch
Buat branch: fix/audit-fase-3-quality
Base: main (setelah Fase 1 + 2 merged).

# Findings yang harus diperbaiki (urut)

## 1. AUDIT-004 (HIGH) — Bundle optimization
TUJUAN:
  - dist/client/assets/index-*.js dari 758KB → target < 500KB
  - dist/client/assets/scan.barcode-*.js → lazy load (tidak di main chunk)
  - jspdf + html2canvas → dynamic import (cuma untuk export PDF)

TUGAS:

### Step 1: Lazy load scan barcode routes
File: src/routes/scan.barcode-camera.tsx, scan.barcode-live.tsx (jika ada)

Refactor:
  import { lazy, Suspense } from "react";
  const ScanBarcodeCamera = lazy(() => import("./scan.barcode-camera"));
  // wrap di Suspense + skeleton loading

ATAU gunakan TanStack Router lazy route loading pattern (sesuai project convention).
Cek dokumentasi: src/routes/README.md atau TanStack docs.

### Step 2: Dynamic import jspdf
File: src/routes/_authenticated/reports.export.tsx (atau nama serupa)

Refactor:
  // Sebelum:
  import jsPDF from "jspdf";

  // Sesudah:
  const handleExport = async () => {
    const { jsPDF } = await import("jspdf");
    // ... use jsPDF
  };

Lakukan hal sama untuk html2canvas (kalau dipakai).

### Step 3: Verify
- bun run build
- Cek ukuran dist/client/assets/index-*.js (harus turun)
- Cek dist/client/assets/scan.barcode-*.js (tidak boleh di-load eagerly dari index)
- ANALYZE=1 bun run build → cek bundle-stats.html

VERIFIKASI:
- index-*.js < 500KB
- scan.barcode-*.js bukan di main entry chunk
- jspdf chunk lazy (cek di network tab dev mode)
- bun run test → 336/336

## 2. AUDIT-006 (MEDIUM) — Fast Refresh fix
TUGAS:
- Untuk 18 file yang punya warning react-refresh/only-export-components:
  - shadcn/ui generated (button, form, badge, navigation-menu, sidebar, toggle, dll):
    → Tambah // eslint-disable-next-line react-refresh/only-export-components di line yang export non-component
    → ATAU extract helper ke .ts file terpisah
  - Custom files (i18n.tsx, DashboardHeader.tsx, dll):
    → Extract helper/constant ke file .ts/.tsx terpisah sesuai context

REFERENSI list (dari lint output, batch per file type):
  src/components/healthyu/{calculator-shell,confidence-badge,lazy-image}.tsx
  src/components/{live-announcer,theme-provider}.tsx
  src/components/ui/{badge,button,form,navigation-menu,sidebar,toggle}.tsx
  src/lib/achievement-icons.tsx  (catatan: ini di lib/, bukan components/)
  src/lib/i18n.tsx
  src/features/dashboard/components/{DashboardHeader,SmartNextStepCard}.tsx
  src/features/onboarding/components/onboardingShared.tsx
  src/features/reminders/components/ReminderPieces.tsx

VERIFIKASI:
- bun run lint → 0 react-refresh warnings
- Dev mode: edit 5 file sampled (button, form, badge, i18n, dashboard) → HMR works (no full reload)

## 3. AUDIT-007 (MEDIUM) — useMemo fix
File: src/routes/_authenticated/articles.tsx (line 37-47)

TUGAS:
- Baca function yang ada di line 37-47.
- Wrap ekspresi `articles` di useMemo terpisah:
  const articlesRaw = useMemo(() => [...], [deps]);
  const articles = useMemo(() => articlesRaw.filter(...), [articlesRaw, otherDeps]);
- Atau restructure logic sesuai konvensi project.

VERIFIKASI:
- bun run lint → 0 react-hooks/exhaustive-deps warning
- bunx tsc --noEmit → 0 errors
- Manual: refresh /articles, scroll, no console warning

## 4. AUDIT-008 (MEDIUM) — Replace top-30 `as any`
TUGAS:
- grep -rn "as any\|@ts-ignore\|@ts-nocheck" src/ → list semua
- Prioritas 30 teratas (berdasarkan file priority: server fn, route auth, API route).
- Per lokasi: replace dengan:
  - `unknown` + Zod parse (untuk external data)
  - Type eksplisit dari integrations/supabase/types.ts (untuk DB response)
  - Generic type (untuk function yang menerima tipe generik)
  - Interface baru (untuk custom shape)
- Untuk `@ts-ignore/@ts-nocheck`: HARUS ada komentar alasan. Jika tidak, hapus dan fix.

CONTOH:
  const data = await response.json() as any;  // BEFORE
  // →
  const DataSchema = z.object({...});
  const data = DataSchema.parse(await response.json());  // AFTER

BATCH per file: 1 PR per 5-10 lokasi (bukan 1 PR untuk 168).

VERIFIKASI:
- Setelah 30 lokasi diperbaiki: `grep -c "as any" src/` turun signifikan
- bun run test → 336/336 + 5+ new tests untuk type safety regression
- bunx tsc --noEmit → 0 errors

# Acceptance Criteria
- [ ] dist/client/assets/index-*.js < 500KB
- [ ] 0 react-refresh warnings di `bun run lint`
- [ ] 0 useMemo dep warnings
- [ ] 30+ `as any` diperbaiki (target minimum)
- [ ] bunx tsc --noEmit → 0 errors
- [ ] bun run lint → 0 errors
- [ ] bun run test → 336/336 + 5+ new tests
- [ ] bun run build → sukses, postbuild-fix applied
- [ ] Manual: dev mode HMR works untuk 5 file sampled

# Commit (batch per kategori)
  chore(audit-004): lazy load scan routes + dynamic import jspdf
  chore(audit-006): fix Fast Refresh untuk 18 file (eslint-disable + extract)
  chore(audit-007): fix useMemo dependency array di articles.tsx
  chore(audit-008): replace 30 as any dengan proper type (batch 1)

# Push
origin:fix/audit-fase-3-quality. BUKAN main.

# Lapor Balik
Format:
- Bundle size before/after (dengan angka)
- Jumlah as any tersisa (dari 168)
- Fast Refresh file mana yang di-extract vs eslint-disable
- Test results
- Bundle stats (screenshot atau angka)
- Next step (Fase 4)
```

---

## Catatan Auditor

- **Bundle optimization** harus hati-hati — setiap dynamic import tambah chunk baru. Trade-off: initial load turun, tapi navigasi antar route bisa terasa sedikit lebih lambat (lazy load delay). Test UX manual wajib.
- **`as any` cleanup** jangan aggressive. Jika 1 type butuh 2-3 jam, schedule batch. Hindari 1 PR 30 file.
- **Fast Refresh** di shadcn/ui: `// eslint-disable-next-line` OK, tapi untuk custom files WAJIB extract.

## Risiko & Mitigasi

| Risiko                                            | Mitigasi                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Lazy load break scan flow                         | Manual QA: buka scan route, test camera + barcode, verify tidak ada regression |
| jspdf dynamic import break PDF export             | Test export di mobile + desktop, verify file generated                         |
| Extract helper break import chain                 | Verify tsc + test pass, audit downstream consumers                             |
| `as any` replacement break runtime type assertion | Tambah Zod schema + test untuk setiap replaced location                        |
| Bundle splitting salah → malah lebih besar        | ANALYZE=1, compare before/after bundle-stats.html                              |
