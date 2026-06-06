# Plan: Image Upload Hardening

## Problem

Per aturan project (rule 16): "Upload gambar wajib validasi MIME, ukuran, dan idealnya resize/strip EXIF."

Current gaps:
1. **No file size validation** on most upload paths (only chat has 5MB client check)
2. **No MIME validation** server-side for progress/story uploads
3. **No resize/compress** on nutrition-label, fridge, chat, progress, and stories uploads
4. **Duplicated `fileToDataUrl`** exists 3 times with slightly different quality settings
5. **Raw base64** sent to AI without resize for nutrition-label and fridge scans (can be huge)
6. **Progress photos** upload raw `File` to Supabase Storage without any validation
7. **Story photos** upload raw `File` via signed URL without validation

## Approach

Small, incremental changes. No new features, no new dependencies. No image moderation expansion (that costs AI tokens and is a separate task).

---

## Phase 5A: Shared Image Utility

### 1. Create `src/lib/image-utils.ts`

Shared client-side utility with:
- `ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]`
- `MAX_FILE_SIZE = 10 * 1024 * 1024` (10 MB raw file limit)
- `validateImageFile(file: File): void` — checks MIME + size, throws on invalid
- `fileToDataUrl(file: File, maxSize?: number): Promise<string>` — resize + JPEG compress + EXIF strip (via canvas re-encoding)
- Move logic from `scanCore.server.ts` `fileToDataUrl` into this shared util
- Re-export from `scanCore.server.ts` and `scanHelpers.ts` for backward compat

**Files changed:**
- `src/lib/image-utils.ts` (new)
- `src/features/scan/lib/scanCore.server.ts` (remove `fileToDataUrl`, re-export from image-utils)
- `src/features/scan/lib/scanHelpers.ts` (update re-export)

---

## Phase 5B: Deduplicate `fileToDataUrl`

### 2. Remove duplicate `fileToDataUrl` from scan.recipe.tsx and scan.menu.tsx

Both have local copies. Replace with import from `@/lib/image-utils`.

**Files changed:**
- `src/routes/_authenticated/scan.recipe.tsx` — remove local `fileToDataUrl`, import from `@/lib/image-utils`
- `src/routes/_authenticated/scan.menu.tsx` — same

---

## Phase 5C: Add Validation + Resize to Unprotected Paths

### 3. `scan.nutrition-label.tsx` — add resize

Currently uses raw `FileReader.readAsDataURL` → no resize. A 12MP phone photo = ~18 MB base64.

Change: use `validateImageFile` + `fileToDataUrl` instead of raw FileReader.

### 4. `scan.fridge.tsx` — add resize

Currently uses `file.arrayBuffer()` → `btoa()` → raw base64. Same huge payload issue.

Change: use `validateImageFile` + `fileToDataUrl`.

### 5. `ChatComposer.tsx` — add resize

Currently has 5MB check but sends raw base64 without resize.

Change: use `validateImageFile` + `fileToDataUrl` (keep existing 5MB check as quick reject, then resize).

### 6. `progress.tsx` — add validation + resize before storage upload

Currently uploads raw `File` to Supabase Storage with no validation.

Change: validate MIME + size client-side, resize via `fileToDataUrl`, convert base64→blob, then upload blob.

### 7. `stories.upload.tsx` — add validation + resize

Currently uploads raw `File` via signed URL with no validation.

Change: validate MIME + size client-side, resize via `fileToDataUrl`, convert base64→blob, then upload blob.

---

## Phase 5D: Server-side MIME Validation

### 8. `scanPhoto.functions.ts` — add MIME allowlist

`attachScanPhoto` already validates `startsWith("data:image/")` but doesn't check specific MIME types.

Change: add `ALLOWED_MIME_TYPES` check after extracting contentType from the data URL.

### 9. `recipeFromFridge` and `ocrNutritionLabel` — add base64 size limit

Currently `z.string().min(10)` / `z.string().min(50)` — no max limit.

Change: add `.max(8_000_000)` to match other image schemas.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/lib/image-utils.ts` | **NEW** — shared validateImageFile + fileToDataUrl |
| `src/features/scan/lib/scanCore.server.ts` | Remove fileToDataUrl body, re-export from image-utils |
| `src/features/scan/lib/scanHelpers.ts` | Update re-export path |
| `src/routes/_authenticated/scan.recipe.tsx` | Remove local fileToDataUrl, import shared |
| `src/routes/_authenticated/scan.menu.tsx` | Remove local fileToDataUrl, import shared |
| `src/routes/_authenticated/scan.nutrition-label.tsx` | Add validateImageFile + fileToDataUrl |
| `src/routes/_authenticated/scan.fridge.tsx` | Add validateImageFile + fileToDataUrl |
| `src/features/chat/components/ChatComposer.tsx` | Add validateImageFile + fileToDataUrl |
| `src/routes/_authenticated/progress.tsx` | Add validateImageFile + fileToDataUrl + upload blob |
| `src/routes/_authenticated/stories.upload.tsx` | Add validateImageFile + fileToDataUrl + upload blob |
| `src/features/scan/lib/scanPhoto.functions.ts` | Add MIME allowlist check |
| `src/features/scan/lib/scanVision.functions.ts` | Add .max() to fridge/nutrition-label schemas |

## Definition of Done

- All image upload paths validate MIME type (jpeg, png, webp only)
- All image upload paths validate file size (10 MB raw limit)
- All image upload paths resize to max 1280px + JPEG compress before sending/uploading
- EXIF stripped as side-effect of canvas re-encoding (already happens, now consistent)
- No duplicated `fileToDataUrl` code
- Server-side schemas have max size limits
- `bunx tsc --noEmit` passes
- `bun run test` passes
- `bun run build` passes

## Not In Scope

- Image moderation expansion to progress/stories/scan (separate task, costs AI tokens)
- Server-side EXIF stripping library (canvas re-encoding is sufficient)
- New dependencies
- Database changes
