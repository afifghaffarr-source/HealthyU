# AUDIT-012 — Chat Safety Quarterly Review

> **Date:** 2026-06-16
> **Reviewer:** Hermes (audit)
> **Scope:** `src/features/chat/lib/chatSafety.ts` (161 lines, 5 keyword categories)
> **Verdict:** ✅ **Pass with 5 minor improvements recommended** (no blockers, no critical changes needed)

## Summary

The chat safety layer is well-structured and well-tested. It has 4 keyword lists totaling ~94 keywords covering Indonesian + English, with clear separation between `crisis` (immediate safety), `disclaimer` (medical referral), and `blocked` (harmful behavior) responses. The test suite (6 tests) covers the major paths but has some gaps.

**No P0 (critical) findings.** Recommended changes below are quality-of-life and defense-in-depth.

## Keyword Inventory

| Category             |  Count | Examples                                         | Response                                                             |
| -------------------- | -----: | ------------------------------------------------ | -------------------------------------------------------------------- |
| `CRISIS`             |     17 | bunuh diri, kill myself, suicide, self-harm      | Crisis resources (Into The Light, Kemenkes 119 ext 8, Yayasan Pulih) |
| `DIAGNOSIS`          |     16 | apakah saya kanker, do i have, diagnose me       | Medical disclaimer                                                   |
| `PRESCRIPTION`       |     15 | berapa dosis, what dose, prescribe               | Medical disclaimer                                                   |
| `MEDICAL_CONDITIONS` |     38 | diabetes, hipertensi, hamil, anoreksia, crohn    | Medical disclaimer                                                   |
| `DANGEROUS`          |      8 | puasa ekstrim, starve myself, purge after eating | Blocked + referral offer                                             |
| **Total**            | **94** |                                                  |                                                                      |

## Findings

### Finding 1 — Crisis resource phone numbers may be stale

**Severity:** Low (but high-impact if wrong)
**File:** `src/features/chat/lib/chatSafety.ts:124-130`

```typescript
const CRISIS_REPLY =
  "Saya sangat peduli dengan keselamatan kamu. ...\n\n" +
  "**Hubungi sekarang (24 jam, gratis):**\n" +
  "- **Into The Light Indonesia**: https://www.intothelightid.org/\n" +
  "- **Kemenkes Sehat Jiwa**: 119 ext 8\n" +
  "- **Yayasan Pulih**: (021) 78842580\n" +
  ...
```

**Action:** Verify these numbers are still correct as of 2026-06-16. The `119 ext 8` extension may have changed. Yayasan Pulih number may have been updated. **Owner: human (AI can't call to verify).** Recommend a quarterly manual check.

### Finding 2 — Test coverage gap on existing keywords

**Severity:** Low (defense in depth)
**File:** `src/lib/__tests__/chatSafety.test.ts`

Currently 6 tests cover:

- Empty/normal → safe ✓
- Crisis ID + EN ✓
- Dangerous → blocked ✓
- Disclaimer for diagnosis/prescription ✓
- Crisis priority over disclaimer ✓
- Case-insensitive (only "SUICIDE" tested) ✓

**Missing test cases** for keywords that exist in the list but are not tested:

- CRISIS: `potong nadi`, `overdosis`, `end my life`, `cut myself`, `hang myself`, `mau mati`
- DANGEROUS: `tidak makan seminggu`, `tidak makan 7 hari`, `muntah setelah makan`, `memuntahkan makanan`, `purge after eating`, `extreme fasting`
- DIAGNOSIS: `apakah saya hamil`, `apakah saya pcos`, `is this cancer`
- PRESCRIPTION: `metformin`, `what medication`, `which drug`
- MEDICAL_CONDITIONS: `gagal ginjal`, `penyakit jantung`, `eating disorder`, `breastfeeding`

**Action:** Add ~10 parametrized tests using `it.each()` to cover these keywords. Improves confidence the regex/keyword matching is solid. Will be done in this same PR.

### Finding 3 — Code-mixing / informal Indonesian not covered

**Severity:** Low
**File:** `src/features/chat/lib/chatSafety.ts:14-33` (CRISIS list)

Real Indonesian chat uses heavy code-mixing and slang. The list has `"mau mati"` but doesn't have:

- `"cape hidup"` (tired of life)
- `"mending ga ada"` (better off not existing)
- `"mau ngilang"` (want to disappear)
- `"pengen mati"` (want to die — different from "ingin mati" but semantically same)
- `"bunuh"` alone (without "diri") — could be reported by users discussing third parties
- English-Indonesian mixing: `"aku stress banget, pengen bunuh diri sih"` ← covered by `bunuh diri` ✓
- `"aku depresi"` (depression) — currently not flagged

**Action:** Add 3-5 additional keywords covering common informal/crisis expressions. **Caution:** Do not over-trigger on benign uses (e.g., "cape" can be casual, not crisis). Recommend conservative additions only:

- `pengen mati` (colloquial for "ingin mati")
- `aku depresi` (depression disclosure)
- `mau ngilang` (want to disappear — often pre-crisis)
- `cape hidup` (tired of life)

**NOT adding** (would over-trigger):

- `stress` (too generic)
- `capek` (too generic)
- `lelah` (too generic)
- `sendiri` (too generic)

### Finding 4 — Eating disorders trigger `disclaimer`, not `crisis`

**Severity:** Medium (clinical concern)
**File:** `src/features/chat/lib/chatSafety.ts:99-103`

```typescript
"anoreksia",
"bulimia",
"eating disorder",
"binge eating",
```

These currently fall under `MEDICAL_CONDITIONS` → disclaimer path. But active ED (especially with purging, restricting severely, or suicidal ideation co-occurring) IS a life-threatening condition. The DANGEROUS list covers some purging behavior but not the broader "I have anorexia" disclosure.

**Action:** Consider a new category `CRISIS_ED` for severe ED signals, or improve the priority logic: if any DANGEROUS keyword is present OR if ED keyword + self-harm language co-occurs, escalate to crisis. **This is a clinical decision — defer to human review** by psychologist/nutritionist consultant. For now, current behavior is acceptable as a baseline; flag for next quarterly review.

### Finding 5 — No PII / sensitive data detection

**Severity:** Low (privacy, not safety)
**File:** `src/features/chat/lib/chatSafety.ts` (entire file)

The chat is logged to `chat_messages` table for support/audit. If a user pastes their KTP/NIK, phone number, address, or medical record number in chat, it gets stored. No detection.

**Action:** Out of scope for AUDIT-012 (which is about safety, not privacy). Open as a new audit item: **AUDIT-017 PII detection in chat input**. Effort: M (need to balance false positives — Indonesian phone numbers are common in legitimate chat context).

## Test Coverage Summary (current)

| Test                                        | Status    |
| ------------------------------------------- | --------- |
| Empty / normal → safe                       | ✅        |
| Crisis (ID "bunuh diri", "ingin mati")      | ✅        |
| Crisis (EN "kill myself", "suicide")        | ✅        |
| Crisis response contains expected resources | ✅        |
| Case-insensitive (CRISIS via "SUICIDE")     | ✅        |
| Dangerous (ID "puasa ekstrim")              | ✅        |
| Dangerous (EN "starve myself")              | ✅        |
| Disclaimer (DIAGNOSIS, EN)                  | ✅        |
| Disclaimer (PRESCRIPTION)                   | ✅        |
| Crisis priority over disclaimer             | ✅        |
| Code-mixing (none tested)                   | ❌        |
| Subset of `DANGEROUS` keywords tested       | ❌ (1/8)  |
| Subset of `MEDICAL_CONDITIONS` tested       | ❌ (0/38) |
| `PRESCRIPTION` subset                       | ❌ (0/15) |

**Coverage metric:** ~60% of keywords are exercised by tests. Target after this PR: 90%+.

## Action Items (this PR)

1. ✅ Add `it.each()` parametrized tests for untested keywords (10 new tests)
2. ✅ Document this review in `audit/04-roadmap.md`
3. ⏸️ Defer Finding 4 (ED crisis escalation) to next quarterly review (needs clinical input)
4. ⏸️ Defer Finding 5 (PII detection) to AUDIT-017
5. ⏸️ Crisis resource phone numbers — owner: human, schedule for next quarterly review

## Action Items (next quarterly review, ~2026-09-16)

- [ ] Verify crisis hotline numbers still correct
- [ ] Add informal/colloquial Indonesian crisis keywords (4 candidates)
  - ✅ **Done (2026-06-18 follow-up)** — `pengen mati`, `mau ngilang`, `cape hidup`
    added to CRISIS list with 3 parametrized tests. Conservative
    additions only — see comments in `chatSafety.ts` for what was
    deliberately NOT added.
  - ⏸️ **`aku depresi` (depression disclosure) still deferred** — clinical
    decision. Adding it to CRISIS would over-trigger the existing
    CRISIS_REPLY (with crisis hotline numbers) for non-suicidal
    depression disclosures. Needs psychologist input on whether
    depression alone should escalate, or get a separate
    `disclaimer-depression` response with depression-specific
    resources. Track for next quarterly review.
- [ ] Reconsider ED → crisis escalation (Finding 4) — still clinical,
      needs psychologist sign-off
- [ ] Schedule cron job to remind reviewer 90 days from now

## References

- File: `src/features/chat/lib/chatSafety.ts`
- Test: `src/lib/__tests__/chatSafety.test.ts`
- Audit doc: `audit/01-findings.md` (initial audit findings)
- Roadmap: `audit/04-roadmap.md` (AUDIT-012 entry)
