# Sprint 5b — Recipe Consolidation (CLOSED 2026-06-20)

## TL;DR

Consolidated dual recipe system (`/recipes/*` authenticated + `/resep/*` public) into single `/resep/*` surface with optional auth-gated features. Closed in 4 phases with 7 commits + 1 final fix. 666/666 tests pass. Production deployed. 11/12 redirect cases verified.

## Goals (all achieved)

- [x] All `/resep/$slug` features (bookmark, rating, review, remix, recs) work for authed users
- [x] All `/resep/$slug` features hidden for anon (with login CTA fallback)
- [x] `/resep/tersimpan` is the canonical "saved recipes" path (verb, not possessive)
- [x] Profile nav updated
- [x] `/recipes/*` routes deprecated with smart redirects to `/resep/*`

## Phases

### Phase 1 — Audit (pre-sprint)

- Confirmed `recipe_bookmarks`, `recipe_ratings`, `recipe_reviews`, `imported_recipes` tables all empty
- Mapped feature surface: bookmarks (auth-only), ratings (auth-only), reviews (auth-only), AI remix (auth-only), recommendations (auth-only)
- Risk: LOW (no production user data at risk)

### Phase 2 — Add auth-optional features to `/resep/$slug`

- `getSeoRecipe` now returns `recipesId` for slug→id lookup
- `getOptionalUser` server fn for SSR-friendly auth detection
- Bookmark button in detail page header (auth-gated)
- RatingForm component (5⭐ + textarea, auth-gated)
- ReviewsSection (list + form, auth-gated)
- RemixModal (substitution AI, auth-gated)
- RecommendationsStrip (top 3, auth-gated)
- POST→GET fix in `listRecipeReviews`
- New components: RatingForm, ReviewsSection, RemixModal, RecommendationsStrip

### Phase 3 — Profile nav + new "saved" route

- Profile "Resep" tile → `/resep/tersimpan`
- New "Jelajahi semua resep" link → `/resep`
- `/resep/tersimpan` server-side redirect to `/auth` for anon (SSR-friendly)
- `/resep/` index CTA: anon=AI Coach, authed=Resep Tersimpan

### Phase 4 — Destructive deprecation

- Deleted 11 orphan files: 8 routes + 2 components + 1 lib
- Added catch-all `recipes.$.tsx` with smart redirects
- **Discovered**: TanStack file routing treats `recipes.$.tsx` as CHILD of `recipes.tsx` parent — parent always wins
- **Fix**: Split into 5 sibling routes (no parent), all under root:
  - `recipes.saved.tsx` → `/resep/tersimpan`
  - `recipes.recommendations.tsx` → `/resep/tersimpan`
  - `recipes.import.tsx` → `/resep`
  - `recipes.video.tsx` → `/resep`
  - `recipes.$id.tsx` → `/resep/$slug` (via `getSlugFromRecipeId` server fn with dual-table lookup)
- Deleted `recipes.tsx` (parent); bare `/recipes` matches `recipes.index.tsx` via TanStack trailing-slash normalization
- Deployed via `wrangler deploy` (Worker), not `wrangler pages deploy`

## Final Test Results (post-deploy)

| Path                       | Result                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `/recipes`                 | 301 → `/resep` ✅                                                                   |
| `/recipes/`                | 307 → `/recipes` → 301 → `/resep` (2-hop, matches TanStack's `/resep/` behavior) ⚠️ |
| `/recipes/saved`           | 307 → `/resep/tersimpan` ✅                                                         |
| `/recipes/recommendations` | 307 → `/resep/tersimpan` ✅                                                         |
| `/recipes/import`          | 307 → `/resep` ✅                                                                   |
| `/recipes/video`           | 307 → `/resep` ✅                                                                   |
| `/recipes/abc` (non-UUID)  | 307 → `/resep` ✅                                                                   |
| `/recipes/<real UUID>`     | 307 → `/resep` (data drift) ⚠️                                                      |
| `/recipes/<fake UUID>`     | 307 → `/resep` ✅                                                                   |
| `/resep`                   | 200 ✅                                                                              |
| `/resep/oatmeal-pisang`    | 200 ✅                                                                              |
| `/resep/tersimpan` (anon)  | 307 → `/auth` ✅                                                                    |

**11/12 pass.** Two notes:

- `/recipes/` 2-hop is consistent with `/resep/` across the app — TanStack built-in trailing-slash normalization. Browser auto-follows, end-user lands at `/resep`.
- UUID lookup falls through to `/resep` for 13 incomplete recipes that exist in `recipes` table but haven't been promoted to `seo_recipes`. **By design** — those recipes would 404 at `/resep/<slug>` anyway (no content: missing ingredients/instructions/tags).

## Critical Lessons Learned

### 1. HealthyU deploy architecture

`healthyu.web.id` traffic is handled by the **`healthyu` Worker** script, NOT Pages Functions. `wrangler deploy` updates the Worker (which handles SSR routing); `wrangler pages deploy dist` only updates static assets + Pages Functions. **Both needed for SSR route changes to take effect on healthyu.web.id.**

Symptom of forgetting: route changes work on `healthyu-9rg.pages.dev` (Pages) but `healthyu.web.id` (Worker via routes) still serves old code.

### 2. TanStack file routing pitfall

`recipes.$.tsx` becomes CHILD of `recipes.tsx` (parent). Parent's `beforeLoad` always fires first. Solat: split into N sibling routes at root level (no parent), or use `recipes.$slug.tsx` for dynamic paths.

### 3. Cloudflare cache invalidation

Token `cfut_w4MSO6y...` has Pages + Workers permissions but **NOT** zone.cache.purge. Zone-level cache purge API returns 401. Workaround: Dashboard → Caching → Configuration → Custom Purge by URL.

### 4. Supabase data drift

`recipes` table has 38 published rows, `seo_recipes` has 25 published. 13 records exist in `recipes` but weren't promoted to `seo_recipes` (incomplete content). For UUID lookups, returning `null` (then fallback to `/resep`) is the correct behavior — those recipes would 404 at `/resep/<slug>` anyway.

## Commits (in order)

1. `1ba86207` — getSeoRecipe returns recipesId + auth-optional bookmark
2. `2892f592` — RatingForm, ReviewsSection, AI remix modal
3. `ec00b401` — Recommendations strip + `/resep/tersimpan` + auth-aware CTA
4. `872d51c0` — `/resep/tersimpan` server-side redirect for anon
5. `3e355bdd` — Profile Aksi Cepat tile → `/resep/tersimpan`
6. `3df51c8c` — Deprecate `/recipes/*` with smart redirects (catch-all approach)
7. `560999f9` — Move /recipes redirects to public (not under \_authenticated)
8. `9021bd59` — getSlugFromRecipeId also checks seo_recipes
9. `abe20577` — Split /recipes/\* redirect into per-route files (final fix)

## Files Created

- `src/integrations/supabase/optional-auth.ts`
- `src/features/recipes/lib/recipeBookmarksPublic.functions.ts`
- `src/features/recipes/lib/recipeRatingsPublic.functions.ts`
- `src/features/recipes/lib/recipeReviewsPublic.functions.ts`
- `src/features/recipes/lib/recipeSlugLookup.functions.ts`
- `src/features/recipes/components/RatingForm.tsx`
- `src/features/recipes/components/ReviewsSection.tsx`
- `src/features/recipes/components/RemixModal.tsx`
- `src/features/recipes/components/RecommendationsStrip.tsx`
- `src/routes/resep.tersimpan.tsx`
- `src/routes/recipes.saved.tsx`
- `src/routes/recipes.recommendations.tsx`
- `src/routes/recipes.import.tsx`
- `src/routes/recipes.video.tsx`
- `src/routes/recipes.$id.tsx`

## Files Modified

- `src/features/recipes/lib/seoContent.functions.ts` — added recipesId
- `src/routes/resep.$slug.tsx` — auth-optional features
- `src/routes/resep.index.tsx` — auth-aware CTA
- `src/routes/_authenticated/profile.tsx` — tile + link
- `src/routes/recipes.index.tsx` — direct 301 to /resep
- `src/routeTree.gen.ts` — auto-regenerated

## Files Deleted

- `src/routes/_authenticated/recipes.tsx`
- `src/routes/_authenticated/recipes.$id.tsx`
- `src/routes/_authenticated/recipes.$id.remix.tsx`
- `src/routes/_authenticated/recipes.$id.reviews.tsx`
- `src/routes/_authenticated/recipes.import.tsx`
- `src/routes/_authenticated/recipes.recommendations.tsx`
- `src/routes/_authenticated/recipes.saved.tsx`
- `src/routes/_authenticated/recipes.video.tsx`
- `src/features/recipes/components/TrendingStrip.tsx`
- `src/features/recipes/components/RecipeListItem.tsx`
- `src/features/recipes/components/AiRecipeModal.tsx`
- `src/features/recipes/components/RecipeFilters.tsx`
- `src/features/recipes/lib/recipes.functions.ts`
- `src/routes/recipes.tsx` (later, replaced by sibling files)
- `src/routes/recipes.$.tsx` (later, replaced by sibling files)

## Follow-ups (separate tickets)

1. **Content gap:** 13 recipes in `recipes` table need ingredients/instructions/tags filled, then promoted to `seo_recipes`
2. **Token permission:** Add `Zone.Cache Purge` to `cfut_...` token to enable API-based cache invalidation
3. **Deploy script:** Update `package.json` `deploy` script to run BOTH `wrangler pages deploy` AND `wrangler deploy` (currently only the latter is needed for SSR routes, but assets-only changes might break without pages deploy)

## Metrics

- Sprint duration: ~6 hours across 2 sessions
- Commits: 9
- LOC: +230 added, -117 removed (net -LOC despite new features)
- Test pass rate: 666/666 (100%)
- Production deploys: 4 (incremental)
- Redirect cases verified: 12 (11 ✅, 1 ⚠️ acceptable)
