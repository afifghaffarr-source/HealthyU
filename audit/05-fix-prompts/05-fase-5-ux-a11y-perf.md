# Fix Prompt — Fase 5: UX / Accessibility / Performance Runtime

> **Untuk di-copy-paste** oleh future agent yang mau tackle runtime hardening.
> **Status:** ⏳ PENDING — PR #5 (LIGHTHOUSE-001 workaround) MERGED, this is the proper fix.
> **Risiko:** Medium (UI changes, a11y semantics, perf trade-offs).
> **Target branch:** `feat/audit-fase-5-runtime` (fresh dari updated main, setelah Fase 1-4 merged).
> **Source investigation:** LIGHTHOUSE-002 in `audit/01-findings.md`, lhci failure logs from PR #5 runs.

> **Naming note:** Original roadmap called this "Fase 4 (UI/UX, Performance & Maintainability)". The LIGHTHOUSE-001 env injection investigation split out as its own sub-fase (see `04-fase-4-env-injection.md` for the prerequisite). This prompt covers the **original Fase 4 body** (UX/a11y/perf) + LIGHTHOUSE-002 followup. Treating it as "Fase 5" because the env injection work consumed the Fase 4 slot.

---

## Copy-Paste Prompt

````
Tugas: Eksekusi Fase 5 dari audit HealthyU — UX/A11y/Performance runtime.

# Konteks
HealthyU di ~/projects/HealthyU. Audit di audit/01-findings.md. Fase 1-4 selesai
merged ke main (PR #2, #3, #5, #6, #7). Main sekarang punya:
- lighthouserc.json: lhci assertions fully permissive (categories: all "off")
- ci.yml bundle-size: 1.5 MB budget (temporary)
- wrangler.jsonc: SUPABASE_PUBLISHABLE_KEY di secrets.required
- 336/336 tests pass, lint 0 errors

Tujuan Fase 5: fix SEMUA real bugs yg di-identify lhci (LIGHTHOUSE-002), revert
CI ke config strict, dan set up runtime observability.

AGENTS.md rules tetap berlaku. Branch protection 5 required status checks aktif.

# Scope: 4 sub-fase (split jadi 4 PR supaya manageable)

## 1. A11y fixes (priority: HIGH) — target PR `feat/audit-fase-5-a11y`

TUJUAN: Home page a11y score 0 → ≥0.9 (re-enable strict gate di step 4)

GUNAKAN tools:
  - axe-core: `bun add -D @axe-core/playwright axe-core` (e2e a11y)
  - vitest-axe: `bun add -D vitest-axe jest-axe` (unit a11y)
  - Manual: Playwright e2e + axe scan di 3 home route (/, /auth, /scan)

TUGAS (urut):

### Step 1: Set up axe-core baseline
  - Tambah `@axe-core/playwright` ke devDeps
  - Buat `e2e/a11y/home.spec.ts`:
    ```ts
    import { test, expect } from "@playwright/test";
    import AxeBuilder from "@axe-core/playwright";

    test("home page has no a11y violations", async ({ page }) => {
      await page.goto("/");
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
    ```
  - Run `bunx playwright test e2e/a11y/` → expect FAIL with current violations
  - Save baseline: list of violations per route

### Step 2: Fix aria-hidden-focus
  Bukti: home page punya element `aria-hidden="true"` dengan focusable children.
  Cari:
    $ grep -rE 'aria-hidden="true"' src/routes -l
    $ grep -rE 'aria-hidden="true"' src/components -l
  Fix per lokasi: tambah `tabindex="-1"` di focusable children, atau remove
  `aria-hidden`, atau restructure component (e.g. modal vs inline content).
  Test: re-run e2e/a11y/home.spec.ts → expect 0 violations of this rule.

### Step 3: Fix color-contrast
  Bukti: home page ada text dengan color ratio < 4.5:1 (WCAG AA).
  Cek:
    $ bunx axe-cli http://localhost:4173/ --tags wcag2aa
  Fix: update color tokens di `src/styles/` atau `src/index.css` agar meet 4.5:1.
  Gunakan tools:
    - https://webaim.org/resources/contrastchecker/
    - browser DevTools → Accessibility panel
  Test: re-run axe → expect 0 color-contrast violations.

### Step 4: Fix valid-source-maps
  Bukti: home page tidak ada source maps (Lighthouse can't trace minified code ke source).
  Fix: enable di `vite.config.ts`:
    ```ts
    export default defineConfig({
      build: {
        sourcemap: true,  // was: false (or undefined)
      },
    });
    ```
  Verify: `bun run build` → dist/client/assets/*.js.map ada. lhci scan → 0 violations.
  Trade-off: build size +30-40% (sourcemaps). Optional: hide di production via
  CF transform rules (e.g. strip `.map` files di deploy).

### Step 5: Fix errors-in-console
  Bukti: home page throws console errors (likely SSR-related).
  Diagnose: Chrome DevTools console, atau:
    $ bunx lighthouse http://localhost:4173/ --only-categories=performance --view
  Fix per error: biasanya dari `useEffect` cleanup, missing key props, atau
  async race conditions. Standard React debugging.
  Test: re-run lhci → expect 0 console errors.

## 2. Perf fixes (priority: HIGH) — target PR `feat/audit-fase-5-perf`

TUJUAN: Home page perf score ≥0.7 (sesuai lhci assertion "warn" minScore 0.7)

TUGAS (urut):

### Step 1: Fix unused-javascript
  Bukti: bundle punya JS yg ga dipake (estimated 200+ KB).
  Diagnose: `bunx vite-bundle-visualizer` (atau `rollup-plugin-visualizer`).
  Fix: tree-shake unused exports, code-split big libs.
  Kandidat: `jspdf`, `html2canvas`, chart libs (lihat AUDIT-004 di Fase 3 plan).

### Step 2: Fix uses-text-compression
  Bukti: dist files ga di-compress di serve.
  Fix: di `wrangler.jsonc`, ensure compression on:
    ```json
    "observability": { "enabled": true }
    ```
    + cek CF dashboard → Speed → Optimization → Auto Minify: ON, Brotli: ON
  Test: `curl -H "Accept-Encoding: br" -I https://healthyu.web.id/...js` →
    expect `Content-Encoding: br`.

### Step 3: Fix lcp-lazy-loaded, prioritize-lcp-image, non-composited-animations
  Bukti: home page LCP image di-lazy-load (defeats purpose), animation ga
  composited (forces layout).
  Fix:
    - LCP image: remove `loading="lazy"`, add `fetchpriority="high"`
    - Animations: use `transform` + `opacity` only, avoid `width`/`height`/`top`
  Test: re-run lhci → expect 0 violations.

## 3. Bundle lazy-load (priority: HIGH) — target PR `feat/audit-fase-5-bundle`

TUJUAN: scan.barcode client chunk < 1 MB (revert CI budget ke 1 MB)

TUGAS:

### Step 1: Lazy-load scan.barcode routes
  Cek: `ls src/routes/_authenticated/scan.barcode*.tsx`
  Refactor ke React.lazy + Suspense:
    ```tsx
    const ScanBarcodeCamera = lazy(() => import("./scan.barcode-camera"));
    // ...
    <Suspense fallback={<Skeleton />}>
      <ScanBarcodeCamera />
    </Suspense>
    ```
  Atau pakai TanStack Router lazy route loading (sesuai project convention).
  Verify: `bun run build` → dist/client/assets/scan.barcode-*.js < 1 MB.

### Step 2: Dynamic import jspdf + html2canvas
  Cek: `grep -rE "from ['\"]jspdf['\"]" src/`
  Refactor:
    ```ts
    // Before:
    import jsPDF from "jspdf";
    // After:
    const generatePdf = async () => {
      const { jsPDF } = await import("jspdf");
      return new jsPDF();
    };
    ```
  Verify: dist/client/assets/jspdf-*.js tidak di-main bundle.

### Step 3: Verify budget
  `bun run build` → check `find dist/client/assets -name "*.js" -size +1024k` → 0 results.
  Test: CI bundle-size job pass di 1 MB budget.

## 4. CI config revert (priority: MEDIUM) — target PR `feat/audit-fase-5-ci-revert`

TUJUAN: Re-enable strict lhci assertions + revert bundle budget ke 1 MB

TUGAS:

### Step 1: Revert lighthouserc.json ke strict
  ```json
  "assert": {
    "preset": "lighthouse:no-pwa",
    "assertions": {
      "categories:performance": ["warn", { "minScore": 0.7 }],
      "categories:accessibility": ["error", { "minScore": 0.9 }],
      "categories:best-practices": ["warn", { "minScore": 0.9 }],
      "categories:seo": ["warn", { "minScore": 0.9 }],
      "csp-xss": "off",
      "is-on-https": "off",
      "redirects-http": "off"
    }
  }
````

Remove `skipAudits` block yg ditambah di PR #5 (no longer needed setelah a11y fixed).

### Step 2: Revert ci.yml budget ke 1 MB

```yaml
BUDGET_KB=1024
```

Remove the TODO comment (no longer needed).

### Step 3: Verify CI strict

Push → lhci must pass with strict config + 1 MB budget.
All 4 audits (perf, a11y, best-practices, seo) meet minScore thresholds.

# Branch strategy

- PR 1: a11y (4 sub-steps)
- PR 2: perf (3 sub-steps)
- PR 3: bundle (3 sub-steps)
- PR 4: ci-revert (3 sub-steps) — must be LAST, depends on 1-3 done
- Each PR base: main (after previous PRs merged)

# Static Gates (wajib pass per PR)

- bunx tsc --noEmit → 0 errors
- bun run lint → 0 errors
- bun run test → 336/336 (atau lebih, jangan kurangi)
- bun run build → success, dist/client/assets/\*.js < 1.5 MB
- lhci → 3/3 routes pass collection, all assertions pass

# Lapor Balik

Format: which sub-PR + per-step result (a11y score before/after, perf score,
bundle size) + lhci final result + blocker (jika ada) + next sub-PR.

```

---

## Catatan Auditor

### Kenapa split jadi 4 sub-PR?

- **Mencegah regression**: a11y/perf work bisa introduce side effects. Small PR = easy review + revert.
- **CI strict mode incremental**: setelah sub-PR 1 (a11y) merged, bisa test lhci a11y category strict. Kalo fail, tau persis a11y masih ada issue.
- **Independent review**: code reviewer bisa focus per concern (a11y vs perf vs bundle).

### Order of work trade-offs

| Order | Pro | Kontra |
|---|---|---|
| 1→2→3→4 (recommended) | Aman, incremental, bisa test strict di akhir | 4 PR = 4x review overhead |
| 3→1→2→4 (bundle first) | Bundle size impact paling measurable | a11y/perf bisa add bundle lagi |
| 1+2+3 parallel, 4 last | Cepat | 3 concurrent branches = conflict hell |

**Recommended: 1→2→3→4** (sequence). Bisa di-combine jadi 2 PR (a11y+perf = "runtime quality", bundle = "perf budget", ci-revert = "strict gate") kalo mau lebih cepat.

### Pitfalls

- **Source maps + bundle size**: enabling `sourcemap: true` adds 30-40% to bundle size. Mungkin overshoot budget 1 MB. Trade-off: dev experience vs prod bundle size. Options:
  - (a) Source maps only for dev: `sourcemap: process.env.NODE_ENV !== "production" ? true : false`
  - (b) Source maps deployed but stripped via CF transform rule
  - (c) Source maps deployed as separate `.map` files (not bundled) — won't count in `find -size +1024k` if regex is right
- **axe-core false positives**: kadang flag element yang sebenernya OK (e.g. `aria-hidden` di SVG). Selalu verify manual sebelum fix.
- **vitest-axe vs @axe-core/playwright**: beda scope. vitest-axe untuk component-level, @axe-core/playwright untuk full page. Butuh dua-duanya untuk coverage yang baik.
- **Lighthouse mobile vs desktop**: config di lhci pake `desktop` preset. Untuk mobile, perlu run manual atau ubah preset. Mobile biasanya lebih strict (slow CPU throttle).
- **WRONG CI config revert timing**: jangan revert lhci ke strict SEBELUM a11y/perf fixed. Bakal balik ke failure.

### Effort estimate

| Sub-PR | Effort | Notes |
|---|---|---|
| A11y (4 steps) | L (4-6 jam) | 4 distinct bug types, need careful testing |
| Perf (3 steps) | L (3-5 jam) | Some bugs trivial (source maps), some need bundler analysis |
| Bundle (3 steps) | M (2-3 jam) | Mostly mechanical refactor |
| CI revert (3 steps) | XS (30 menit) | Just config tweaks |
| **Total** | **L+ (10-15 jam)** | Bisa dipecah jadi 2-3 hari sprint |

### Optional enhancements (if time permits)

- **Code coverage**: `bunx vitest --coverage` (target: ≥60%)
- **Dependency audit**: `bun audit` (when stable) atau `npm audit --omit=dev`
- **Playwright e2e expansion**: tambah tests untuk critical user flows (20 flows per audit plan)
- **Real Lighthouse mobile**: run manual di real device, compare dengan CI desktop scores
- **Error monitoring**: integrate Sentry (atau alternatif) untuk runtime error tracking
- **Bundle visualizer**: tambah `rollup-plugin-visualizer` untuk ongoing bundle monitoring

### Related references

- LIGHTHOUSE-002 in `audit/01-findings.md` (this prompt's source)
- `audit/04-roadmap.md` Fase 4-5 (original plan)
- LIGHTHOUSE-001 + skill `vite-cf-ssr-env-isolation` (prerequisite)
- axe-core docs: https://github.com/dequelabs/axe-core
- @axe-core/playwright: https://playwright.dev/docs/accessibility-testing
- Lighthouse scoring: https://developer.chrome.com/docs/lighthouse/performance/performance-scoring
```
