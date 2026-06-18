# AUDIT-018 — Right-to-Access Data Export (UU PDP)

> **Status:** ✅ DONE (2026-06-17)
> **Source:** Split out from AUDIT-017 per Afif's decision (see `docs/audit-017-phase3-retention-2026-06-16.md`)
> **Commits:** `09d9e89b` (account-deletion UI + public policy page), `7aebbfc5` (`/backup` wire-up + tests)
> **Migrations:** Existing `public.log_audit_event` RPC + `public.audit_log` table (added 2026-06-04, see `supabase/migrations/20260604040830_*.sql`)

## Legal basis

Undang-Undang Pelindungan Data Pribadi (UU PDP) No. 27 Tahun 2022 gives
"subjek data" (data subjects) the right to obtain a copy of their personal
data being processed. HealthyU operationalizes this via two complementary
endpoints:

| Right                         | Server fn                          | UI entry           | Audit event                                                 |
| ----------------------------- | ---------------------------------- | ------------------ | ----------------------------------------------------------- |
| Right to access (portability) | `pdpRights.exportMyData`           | `/backup`          | `pdp.export`                                                |
| Right to erasure (deletion)   | `pdpRights.requestAccountDeletion` | `/profile/privacy` | `account.deletion_requested` / `account.deletion_cancelled` |

This doc covers the **right to access** part. The right-to-erasure flow is
documented in the same server-fn file (`pdpRights.functions.ts`) and shipped
in `09d9e89b`.

## Problem

The original `/backup` route (HealthyU's user-facing export UI) was wired
to `exportAllData` — a parallel implementation in
`src/features/export/lib/export.functions.ts` that returned the same data
shape but **never wrote an audit event**. Result: users could download
every byte of their personal data with zero forensic trail. That defeats
the entire point of an export endpoint from a UU PDP perspective — the
regulator (and the user's own legal counsel) must be able to answer
"did this user actually request this export, and when?".

## Design decisions

### 1. One canonical table list

`src/lib/userDataTables.ts` is the **single source of truth** for which
tables contain user-owned rows. It exports:

- `USER_DATA_TABLES` — 96 user-owned tables, each with `{ table, ownerColumn, optional }`
- `EXCLUDED_USER_DATA_TABLES` — 6 tables explicitly excluded with a written reason
  (e.g. `rate_limit_log` = internal counter, not personal data)
- `FORBIDDEN_LEGACY_TABLE_NAMES` — 4 dead table names (e.g. `meals`, `workouts`)
  that the test suite asserts never reappear in the canonical list

The `optional` flag is **load-bearing**: if a table is marked `optional`,
query errors are swallowed (returned as `[]`); if `required`, errors
surface as `{ error: "unavailable" }` so the user knows the export is
incomplete **without** blocking the whole export.

### 2. Audit-log every export, not just "an" export

Every successful call to `exportMyData` writes one row to `public.audit_log`
via the existing `log_audit_event(_action, _entity, _entity_id)` RPC:

```ts
await supabase.rpc("log_audit_event", {
  _action: "pdp.export",
  _entity: "user",
  _entity_id: userId,
});
```

No PII is logged — only the user id (already in `audit_log.user_id`) and
the action name. The export _content_ stays on the user's device; the
audit log is for "who/when/that-it-happened", not "what-was-shared".

### 3. Never throw mid-export

A user has 96 tables' worth of data. If one query fails (e.g. a transient
RLS blip), the export must NOT abort — the user loses nothing by getting
`{ error: "unavailable" }` for that one table, but loses a lot by getting
an exception. The CSV branch in the route skips error markers; the JSON
branch includes them so the user knows the export was partial.

### 4. Two formats, one server call

The `/backup` route lets users pick JSON (machine-readable, complete) or
CSV (human-readable, excludes error markers). Both share a single
`exportMyData()` call — no duplication, no risk of drift.

## What was built

### Server (`src/features/privacy/lib/pdpRights.functions.ts`)

- `buildExportDump(supabase, userId)` — pure function. Iterates
  `USER_DATA_TABLES`, queries each with `supabase.from(table).select("*").eq(<owner>, userId)`,
  handles optional/required errors per design §1.3. Exported for
  testability.
- `exportMyData` — `createServerFn({ method: "GET" })` wrapping
  `requireSupabaseAuth` middleware + `buildExportDump` + the
  `log_audit_event` audit call. Returns the full dump.
- `requestAccountDeletion` / `cancelAccountDeletion` / `getDeletionRequest`
  — right-to-erasure siblings (shipped `09d9e89b`).

### UI

- `src/routes/_authenticated/backup.tsx` — JSON / CSV download buttons.
  Wired to `pdpRights.exportMyData` (was: `exportAllData`).
- `src/routes/_authenticated/profile.privacy.tsx` — "Bantu tingkatkan AI"
  toggle + links to `/backup` and `/privacy` + `DeleteAccountSection`.
- `src/features/privacy/components/delete-account-section.tsx` —
  typed-phrase confirmation ("HAPUS") + pending-state banner.
- `src/routes/privacy.tsx` — public UU PDP disclosure page (9 sections).

### Canonical list

- `src/lib/userDataTables.ts` — 96 included + 6 excluded + 4 forbidden
  legacy names, with rationale comments and a test that asserts disjointness.

### Cleanup

- Deleted `src/features/export/lib/export.functions.ts` (the legacy
  unaudited `exportAllData`). Zero remaining callers after the `/backup`
  wire-up; the empty `src/features/export/` directory is also gone to
  prevent future drift.

## Tests

| File                                                         | What                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/__tests__/userDataTables.test.ts`                   | Disjointness, owner-column routing (`id` for profiles, `user_id` elsewhere), no legacy names, every excluded entry has a 10+ char reason. 5 tests.                                                                                                    |
| `src/features/privacy/__tests__/pdpRights.functions.test.ts` | `buildExportDump` unit tests: metadata, owner routing, row arrays, optional-table errors → `[]`, required-table errors → `{ error: "unavailable" }` (no throw), no error-text leak, worst-case "every table errors" returns a complete dump. 6 tests. |
| `src/features/privacy/__tests__/use-delete-account.test.ts`  | Hook behaviour: confirm phrase ("HAPUS", exact), pending-state transitions, mutation calls. 7 tests.                                                                                                                                                  |

Total: 493/493 tests pass (was 472 before this audit — +21 from this
audit and from Vexo model short-name work).

## Verification

| Check                  | Result                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `bunx tsc --noEmit`    | ✓ 0 errors                                                                                               |
| `bun run test`         | ✓ 493/493 (58 files)                                                                                     |
| `bun run lint`         | ✓ clean                                                                                                  |
| `bun run build`        | ✓ success (28.32s)                                                                                       |
| Production deploy      | ✓ `7aebbfc5` live on `healthyu.web.id` (CI 4/4 expected — verified at merge time)                        |
| `git log --oneline -3` | `7aebbfc5 feat(privacy): wire /backup to audit-logged pdpRights.exportMyData` ← this audit's main commit |

## What this audit did NOT do (deferred)

- **AUDIT-019 — redaction toggle (AUDIT-017 Phase 4).** The PII detection
  system can flag sensitive patterns (KTP, phone, etc.) but there is no
  user-facing UI to _redact_ a flagged substring before it lands in
  `chat_messages`. This was explicitly deferred to AUDIT-019 per the
  Phase 3 doc. Out of scope for this audit.
- **Auto-escalation of ED disclosures to crisis resources** (chatSafety
  Finding 4 → D). Requires psychologist/nutritionist sign-off, deferred
  to next quarterly clinical review. Engineering side (info resources
  - de-identified analytics) shipped in `866ffa86`.
- **Right-to-erasure cron.** `requestAccountDeletion` queues a request
  row in `account_deletion_requests`; an admin or cron worker must
  process the actual hard-delete. The cron worker itself is out of
  scope for this audit — see "Fase 5 Production Hardening" in the
  project backlog.

## Follow-ups

1. **AUDIT-019** — redaction toggle (above)
2. **Fase 5** — backup/rollback/monitoring for the right-to-erasure cron
3. **Manual security cleanup** (Afif's task) — revoke old GH PAT + CF token
4. ✅ **Done (2026-06-18)** — `wrangler.jsonc` `VITE_VAPID_PUBLIC_KEY` was already
   removed in `00c79e79` (lighthouse audit fix). Followed up by also
   removing the related dead CF secret `VAPID_PUBLIC_KEY` (never read
   by code — the public key is hardcoded in `src/lib/push-config.ts`),
   the dead `VAPID_PUBLIC_KEY?:` type field in
   `src/lib/cloudflare-env.server.ts`, and the stale entry in
   `wrangler-secrets.md`. See commit message of the next audit
   followup for full detail.
