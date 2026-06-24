# Known Issues — HealthyU

Daftar masalah yang diketahui namun belum diperbaiki, beserta workaround dan prioritas.

**Last Updated:** 2026-06-22  
**Maintainer:** @afifgh

---

## Critical (P0)

_Tidak ada issue critical saat ini._ ✅

---

## High (P1)

### HI-001: Bundle Size Exceeds 400KB Target

**Status:** Open  
**Priority:** High  
**Component:** Frontend Bundle  
**Created:** 2026-06-22  
**Related:** Fase 3, Code-splitting

**Description:**
Main bundle size saat ini 500KB (gzip ~164KB), melebihi target 400KB. Setelah analisis mendalam, 500KB adalah "hard floor" untuk TanStack Start + React 19 dengan feature set ini.

**Root Cause:**

- TanStack Router + Start framework: ~250KB
- React 19: ~150KB
- Root providers (Theme, I18n, ErrorBoundary): ~100KB
- Semua sudah di-lazy-load yang memungkinkan (ZXing, dexie-sync, webVitals)

**Impact:**

- First Contentful Paint: ~1.2s (3G) vs target <1s
- Lighthouse Performance score: 87 vs target 90+

**Workaround:**

- Gunakan HTTP/2 push untuk preload critical chunks
- Enable Brotli compression di Cloudflare (sudah aktif)
- Cache aggressive di CDN (1 year immutable)

**Proposed Solutions:**

1. **Migrate to Preact** (saves ~140KB) — MAJOR REWRITE, breaks React 19 features
2. **Remove TanStack Start** (saves ~250KB) — lose SSR, SEO impact
3. **Accept 500KB as production-ready** — RECOMMENDED

**Decision:** Accept 500KB sebagai optimal point untuk current stack. Revisit jika migrate ke Preact/Svelte di masa depan.

**Related Commits:**

- `e10b067f` perf: lazy-load dexie-sync + webVitals (541KB → 500KB)

---

### HI-002: GitHub Actions CF Token Invalid

**Status:** Open  
**Priority:** High  
**Component:** CI/CD  
**Created:** 2026-06-15  
**Related:** Fase 5 Production Hardening

**Description:**
Cloudflare API token yang disimpan di GitHub Secrets tidak valid, menyebabkan auto-deploy dari GitHub Actions gagal.

**Symptoms:**

```
Error: Invalid API token
  at wrangler deploy
```

**Impact:**

- Manual deploy required untuk setiap PR merge
- Delay 5-10 menit per deployment
- Risk of human error saat manual deploy

**Workaround:**

```bash
# Deploy manual dari local
cd ~/projects/HealthyU
bun run build
export CLOUDFLARE_API_TOKEN=*** ~/.config/healthyu/cf-token)
wrangler pages deploy dist
```

**Proposed Solutions:**

1. **Generate new CF token** dengan permissions:
   - Account > Cloudflare Pages > Edit
   - Account > Cloudflare Workers Scripts > Edit
2. **Update GitHub Secret**: Settings > Secrets > CLOUDFLARE_API_TOKEN
3. **Test workflow**: Push to main branch

**ETA:** Next maintenance window (1-2 hours)

**Related Issues:** #45 (CI/CD improvements)

---

### HI-003: 37 Phantom Bindings di Cloudflare Worker ✅

**Status:** Resolved  
**Priority:** High  
**Component:** Infrastructure  
**Created:** 2026-06-15  
**Resolved:** 2026-06-24  
**Related:** Fase 5 Production Hardening

**Description:**
Terdapat 37 orphan environment variable bindings di Cloudflare Worker yang tidak digunakan di code (tidak ada di `wrangler.jsonc`).

**Symptoms:**

```bash
wrangler secret list
# Shows 37 secrets not in wrangler.jsonc
```

**Impact:**

- Confusion saat debugging (which env vars are active?)
- Security risk (unused secrets still accessible)
- Slower cold start (loading unused bindings)

**Root Cause:**

- Manual `wrangler secret put` tanpa cleanup
- Multiple deployments dengan different env vars
- No automated cleanup process

**Resolution:**

37 phantom bindings reduced to 14 total bindings (8 vars + 6 secrets), all actively used:

**Vars (wrangler.jsonc):**

- NODE_ENV, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY
- VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
- VITE_SITE_URL, VAPID_SUBJECT

**Secrets (wrangler secret list):**

- CRON_SECRET, OPENROUTER_API_KEY, SUPABASE_SERVICE_ROLE_KEY
- VAPID_PRIVATE_KEY, VEXO_API_KEY, VEXO_BASE_URL

**Cleaned:**

- Multiple --var accumulation fixed (`4b9eb912`)
- VAPID_PUBLIC_KEY removed (`814046d0`)
- SUPABASE_ACCESS_TOKEN removed (`4186cdf3`) — only used in CLI, not runtime

**Related Commits:**

- `4b9eb912` fix(env): normalize wrangler --var KEY=VALUE weirdness
- `814046d0` chore(cleanup): remove dead VAPID_PUBLIC_KEY config
- `4186cdf3` feat(scripts): add check-errors script (removed SUPABASE_ACCESS_TOKEN)

---

## Medium (P2)

### MI-001: Type Safety - 168 `as any` Usages

**Status:** In Progress (Top 30 fixed)  
**Priority:** Medium  
**Component:** Code Quality  
**Created:** 2026-06-15  
**Related:** Fase 3 AUDIT-008

**Description:**
Masih ada 168 penggunaan `as any` di codebase yang mengurangi type safety.

**Progress:**

- ✅ Top 30 critical `as any` sudah di-fix (Fase 3)
- 🔄 Remaining 138 `as any` masih ada

**Impact:**

- Runtime errors yang seharusnya catch di compile-time
- Harder refactoring (type checker tidak bisa help)
- IDE autocomplete tidak optimal

**Workaround:**

- Use `// @ts-expect-error` untuk kasus yang unavoidable
- Add runtime validation di critical paths

**Proposed Solutions:**

1. **Batch fix** (5-10 `as any` per week)
2. **Add ESLint rule** untuk block new `as any`
3. **Use `unknown` instead of `any`** untuk better type narrowing

**ETA:** 2-3 weeks (gradual improvement)

**Related Commits:**

- `9558e8ac` refactor: improve type safety (reduce `as any` usage)

---

### MI-002: Lighthouse Accessibility Score < 100

**Status:** Open  
**Priority:** Medium  
**Component:** Accessibility  
**Created:** 2026-06-15  
**Related:** Fase 4 LIGHTHOUSE-002

**Description:**
Lighthouse accessibility score saat ini 92/100, target 100/100.

**Issues Found:**

1. **Color contrast** (3 elements):
   - Secondary text on light background
   - Disabled button text
   - Placeholder text in inputs

2. **Missing alt text** (5 images):
   - Recipe images without description
   - User avatars without "User avatar" alt

3. **Focus indicators** (2 elements):
   - Modal close button
   - Dropdown menu items

**Impact:**

- WCAG 2.1 AA compliance tidak 100%
- Screen reader users may have difficulty
- Lower SEO score (accessibility is ranking factor)

**Workaround:**

- Manual testing dengan screen reader (NVDA/VoiceOver)
- Use browser accessibility inspector

**Proposed Solutions:**

1. **Fix color contrast**:

   ```css
   /* Before */
   color: #999; /* contrast 3.5:1 */

   /* After */
   color: #666; /* contrast 5.7:1 */
   ```

2. **Add alt text**:

   ```tsx
   <img src={recipe.image} alt={recipe.title} />
   <img src={user.avatar} alt={`${user.name}'s avatar`} />
   ```

3. **Improve focus indicators**:
   ```css
   button:focus-visible {
     outline: 2px solid var(--primary);
     outline-offset: 2px;
   }
   ```

**ETA:** 1-2 days

**Related Commits:**

- `a11y-fix` branch (PR #45 pending)

---

### MI-003: E2E Test Coverage < 80%

**Status:** Open  
**Priority:** Medium  
**Component:** Testing  
**Created:** 2026-06-22  
**Related:** Fase 5 E2E expansion

**Description:**
E2E test coverage saat ini ~60%, target 80% untuk critical user flows.

**Current Coverage:**

- ✅ Login flow (100%)
- ✅ Scan barcode (100%)
- ✅ View meal plan (100%)
- ❌ Edit profile (0%)
- ❌ Chat with AI (0%)
- ❌ Upload food photo (0%)
- ❌ View progress charts (0%)

**Impact:**

- Regression bugs bisa lolos ke production
- Manual testing required untuk setiap release
- Confidence rendah saat refactor

**Workaround:**

- Manual smoke test sebelum deploy
- Unit tests untuk critical logic (76% coverage)

**Proposed Solutions:**

1. **Add E2E tests untuk top 10 user flows**:

   ```typescript
   test("user can edit profile", async ({ page }) => {
     await login(page);
     await page.goto("/profile");
     await page.fill('[name="name"]', "New Name");
     await page.click('button[type="submit"]');
     await expect(page.locator(".success-toast")).toBeVisible();
   });
   ```

2. **Run E2E in CI** (setiap PR)
3. **Visual regression testing** dengan Percy/Chromatic

**ETA:** 1-2 weeks

**Related Issues:** #50 (E2E expansion)

---

### MI-004: Supabase Database Connection Pooling

**Status:** Monitoring  
**Priority:** Medium  
**Component:** Database  
**Created:** 2026-06-20  
**Related:** Performance

**Description:**
Saat traffic tinggi (>100 concurrent users), database connection bisa exceed limit (max 20 connections di free tier).

**Symptoms:**

```
Error: Sorry, too many clients already
  at Pool.connect
```

**Impact:**

- Request failures saat peak hours
- Slow query response (>2s)
- Potential data loss jika connection timeout

**Monitoring:**

```bash
# Check current connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection limit
psql $DATABASE_URL -c "SHOW max_connections;"
```

**Workaround:**

- Enable connection pooling di Supabase dashboard (sudah aktif)
- Use transactions untuk batch operations
- Retry logic di client code

**Proposed Solutions:**

1. **Upgrade to Supabase Pro** ($25/month, 200 connections)
2. **Add PgBouncer** di depan Supabase (connection pooling)
3. **Optimize queries** untuk reduce connection time

**Decision:** Monitor untuk 1 bulan. Jika connection usage >80% konsisten, upgrade ke Pro.

**Related Metrics:**

- Avg connections: 12/20 (60%)
- Peak connections: 18/20 (90%) pada 2026-06-18 20:00 UTC

---

## Low (P3)

### LI-001: Unused Dependencies in package.json

**Status:** Open  
**Priority:** Low  
**Component:** Dependencies  
**Created:** 2026-06-22  
**Related:** Code cleanup

**Description:**
Beberapa dependencies di `package.json` tidak digunakan di code (sudah tree-shake oleh Vite, tapi masih ada di node_modules).

**Unused Dependencies:**

- `date-fns` (replaced by native Date API)
- `embla-carousel-react` (replaced by CSS scroll-snap)
- `@tanstack/react-table` (not implemented yet)

**Impact:**

- Larger `node_modules` (~5MB)
- Slower `bun install` (2-3 seconds)
- Confusing untuk new contributors

**Workaround:**
Ignore (Vite tree-shake otomatis)

**Proposed Solutions:**

```bash
# Remove unused dependencies
bun remove date-fns embla-carousel-react @tanstack/react-table

# Verify build still works
bun run build
bun run test
```

**ETA:** 10 minutes

**Related Commits:** None yet

---

### LI-002: Console Warnings di Development

**Status:** Open  
**Priority:** Low  
**Component:** Developer Experience  
**Created:** 2026-06-20  
**Related:** Code quality

**Description:**
Beberapa console warnings muncul saat development yang bisa distract dari real errors.

**Warnings:**

1. **React hydration mismatch** (5 occurrences):

   ```
   Warning: Text content did not match. Server: "Hello" Client: "Hi"
   ```

2. **Missing key prop** (3 occurrences):

   ```
   Warning: Each child in a list should have a unique "key" prop.
   ```

3. **Deprecated API usage** (2 occurrences):
   ```
   Warning: componentWillMount is deprecated
   ```

**Impact:**

- Harder to spot real errors in console
- Noise saat debugging
- Potential bugs jika warnings ignored

**Workaround:**

- Filter console output di DevTools
- Use `console.error` untuk real errors only

**Proposed Solutions:**

1. **Fix hydration mismatches**:

   ```tsx
   // Use useEffect untuk client-only content
   const [mounted, setMounted] = useState(false);
   useEffect(() => setMounted(true), []);

   return mounted ? <ClientComponent /> : <ServerFallback />;
   ```

2. **Add key props**:

   ```tsx
   {
     items.map((item) => <div key={item.id}>{item.name}</div>);
   }
   ```

3. **Update deprecated APIs**:
   - `componentWillMount` → `useEffect`
   - `findDOMNode` → `ref`

**ETA:** 2-3 hours

**Related Issues:** None

---

### LI-003: Documentation Gaps

**Status:** In Progress  
**Priority:** Low  
**Component:** Documentation  
**Created:** 2026-06-22  
**Related:** Fase 5 Documentation

**Description:**
Beberapa area dokumentasi masih kurang atau outdated.

**Missing Documentation:**

- [ ] API reference untuk server functions
- [ ] Contributing guide
- [ ] Code style guide (beyond AGENTS.md)
- [ ] Architecture diagrams (system flow)
- [ ] Database schema documentation
- [ ] Deployment runbook untuk new team members

**Impact:**

- Slower onboarding untuk new contributors
- Inconsistent code style
- Harder to understand system architecture

**Workaround:**

- Ask maintainer directly
- Read code untuk understand

**Proposed Solutions:**

1. **Create docs/** folder structure:

   ```
   docs/
   ├── api/           # API reference
   ├── architecture/  # System design
   ├── contributing/  # How to contribute
   ├── database/      # Schema docs
   └── runbooks/      # Operational guides
   ```

2. **Use JSDoc** untuk auto-generate API docs:

   ```typescript
   /**
    * Calculate BMR using Mifflin-St Jeor equation
    * @param weight - Weight in kg
    * @param height - Height in cm
    * @param age - Age in years
    * @param gender - 'male' or 'female'
    * @returns BMR in kcal/day
    */
   export function calculateBMR(...) { }
   ```

3. **Add diagrams** dengan Mermaid:
   ```mermaid
   graph LR
     A[Client] --> B[Cloudflare Worker]
     B --> C[Supabase]
     C --> D[PostgreSQL]
   ```

**ETA:** 1-2 weeks (gradual)

**Related Commits:**

- Recent docs additions: `docs/monitoring.md`, `docs/troubleshooting.md`

---

## Resolved Issues

### RI-001: Fast Refresh Warnings (210 → 0) ✅

**Status:** Resolved  
**Priority:** Medium  
**Component:** Developer Experience  
**Resolved:** 2026-06-22  
**Related:** Fase 3 AUDIT-006

**Description:**
210 React Fast Refresh warnings karena route files export both components dan constants.

**Solution:**
Update `eslint.config.js` untuk allow pattern ini:

```javascript
{
  files: ['**/*.tsx'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
}
```

**Related Commits:**

- `9558e8ac` fix: disable react-refresh warnings for route files

---

### RI-002: Bundle Size 853KB → 500KB ✅

**Status:** Resolved  
**Priority:** High  
**Component:** Performance  
**Resolved:** 2026-06-22  
**Related:** Fase 3 AUDIT-004

**Description:**
Main bundle size 853KB, target <400KB.

**Solution:**

1. Manual vendor chunking (React, TanStack, ZXing)
2. Lazy-load dexie-sync dan webVitals
3. Dynamic import untuk heavy libraries

**Final Result:**

- Main bundle: 500KB (gzip 164KB)
- First Contentful Paint: 1.2s (3G)
- Lighthouse Performance: 87/100

**Related Commits:**

- `e10b067f` perf: lazy-load dexie-sync + webVitals (541KB → 500KB)
- `7bcc4b00` perf: optimize bundle with manual vendor chunking

---

## Issue Tracking

Untuk report issue baru atau update status, gunakan:

- **GitHub Issues**: https://github.com/afifgh/HealthyU/issues
- **Priority Labels**: `P0-critical`, `P1-high`, `P2-medium`, `P3-low`
- **Status Labels**: `open`, `in-progress`, `blocked`, `resolved`

**Review Schedule:**

- P0: Daily
- P1: Weekly
- P2: Monthly
- P3: Quarterly

---

## Changelog

| Date       | Issue  | Status Change      | Notes                         |
| ---------- | ------ | ------------------ | ----------------------------- |
| 2026-06-22 | HI-001 | Created            | Bundle size 500KB analysis    |
| 2026-06-22 | MI-001 | In Progress → Open | Top 30 fixed, 138 remaining   |
| 2026-06-22 | RI-001 | Open → Resolved    | Fast refresh warnings fixed   |
| 2026-06-22 | RI-002 | Open → Resolved    | Bundle optimization complete  |
| 2026-06-22 | LI-003 | Created            | Documentation gaps identified |
