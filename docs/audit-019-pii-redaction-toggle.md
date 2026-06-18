# AUDIT-019 — PII Redaction Toggle (User-Controlled, Server-Enforced)

> **Status:** ✅ DONE (2026-06-18)
> **Source:** AUDIT-017 Phase 4 (deferred) — see `docs/audit-017-pii-detection-scoping.md`
> **Commits:** `881882de` (`redactPII` helper, foundation), `5c266306` (server + UI + tests)
> **Migration:** `supabase/migrations/20260618012154_audit_019_pii_redact_toggle.sql` (applied to production)

## Problem

The chat_messages table stores user-typed content as-is. Even with the
Phase 1 client-side warning (AUDIT-017) and Phase 2 server-side audit
(AUDIT-017 Phase 2E), the actual PII still goes to the AI upstream
(VexoAPI). Users have no way to opt out of this leak without stopping
chat entirely.

Phase 4 of the original AUDIT-017 scoping doc called for a user-facing
toggle that "redacts PII from AI responses" — this audit ships that
toggle.

## Design decisions

### 1. Default OFF (opt-in)

Privacy is opt-in for advanced features per the project's `/privacy`
policy. A user who never opens `/profile/privacy` keeps the current
behavior (audit-only, no redaction). The toggle is explicit consent.

### 2. The redacted version is ONLY for the AI boundary

Three different downstream consumers see the message, and each gets the
right version for its purpose:

| Consumer                                     | What it sees | Why                                                                       |
| -------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| `chat_messages` table (persistence)          | original     | User's chat history is intact — they can see what they sent               |
| `checkChatSafety` (safety classifier)        | original     | Must catch user intent (self-harm, ED, crisis), not the redacted form     |
| `classifyMessage` (tier model selection)     | original     | Tier decision should reflect the user's actual ask, not the redacted form |
| `cacheKey` (response cache)                  | redacted     | Different-redaction-state users must not collide on the same key          |
| `buildChatPayload` (AI conversation history) | redacted     | The AI sees `[REDACTED:phone]` instead of the actual number               |
| `streamAiChat` (VexoAPI call)                | redacted     | The actual third-party boundary we're protecting                          |

### 3. Fail-open on read errors

If the profile read for `pii_redact_enabled` throws (network blip, RLS
hiccup), the chat stream logs the error and proceeds with the original
message. The rationale: a broken chat is worse than a missed redaction.
The user can always re-send the message; if the redaction had been
silently turned ON for them, they'd never know their PII leaked.

### 4. Audit log records redaction (NOT the PII value)

When redaction fires, the chat stream writes an `audit_log` row:

```ts
supabase.rpc("log_audit_event", {
  _action: "chat.pii.redacted",
  _entity: "chat",
  _meta: { message_length: body.message.length },
});
```

The `meta` field carries the original message LENGTH (for analytics:
"how much PII is being submitted on average") but NEVER the PII value
itself. Logging the matched PII would just create a new PII leak
surface in our audit log — defeating the entire purpose.

This is the same `log_audit_event` RPC + `audit_log` table used by
AUDIT-017 Phase 2E (PII detection) and AUDIT-012 (ED disclosures).
Privacy team can query `audit_log` filtered by `action` to answer:

- "How many PII-containing messages did we get this week?" (`action = 'chat.pii.detected'`)
- "How many of those were redacted?" (`action = 'chat.pii.redacted'`)

### 5. Overlapping PII patterns prefer the more specific kind

A 16-digit number matches BOTH the `ktp` pattern (16 consecutive digits)
and the `credit_card` pattern (13-19 digit card-like number). The
redaction must pick one — the more specific kind wins:

| Input                                          | Tagged as     | Why                                |
| ---------------------------------------------- | ------------- | ---------------------------------- |
| `3201234567890001` (16 consecutive digits)     | `ktp`         | Specific to Indonesian national ID |
| `4111 1111 1111 1111` (16 digits with spaces)  | `credit_card` | No word-boundary match for ktp     |
| `081234567890` (10-13 digits starting with 08) | `phone`       | Phone-specific pattern             |

This matters because the `[REDACTED:ktp]` placeholder is more
informative to the AI than `[REDACTED:credit_card]` for an Indonesian
context — and a confused AI may give a less helpful answer.

## What was built

### 1. Migration (`supabase/migrations/20260618012154_audit_019_pii_redact_toggle.sql`)

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pii_redact_enabled BOOLEAN NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.pii_redact_enabled IS '...';
```

Applied to production Supabase on 2026-06-18 via the management API
(`sbp_*` token, secure workflow). Verified via `information_schema` +
`pg_attribute` queries.

### 2. `redactPII(text)` helper (`src/lib/pii.ts`)

Replaces every PII finding with `[REDACTED:<kind>]` placeholders.
Reuses the existing `PATTERNS` array from `detectPII` so any future
pattern addition is automatically covered. Dedups overlapping matches
by start index, preferring earlier (more specific) patterns. Idempotent:
redacting an already-redacted string is a no-op.

**Tests** (`src/lib/__tests__/piiRedact.test.ts`, 10 tests):

- No-PII passthrough
- Each kind individually
- Multiple kinds in one message
- Surrounding punctuation preserved
- Empty / non-string graceful
- Idempotency

### 3. Server fns (`src/features/privacy/lib/piiRedactToggle.functions.ts`)

- `getPiiRedactEnabled(supabase, userId)` — pure function. Fail-safe
  (returns `false` on read error). Tests verify all 5 cases.
- `setPiiRedactEnabled(supabase, userId, enabled)` — pure function.
  Throws on RLS error.
- `getPiiRedactEnabledFn` / `setPiiRedactEnabledFn` — server-fn
  wrappers with `requireSupabaseAuth` middleware (used by
  `/profile/privacy`).

**Tests** (`src/features/privacy/__tests__/piiRedactToggle.functions.test.ts`, 8 tests):

- Read returns true / false / default-on-missing / default-on-error
- Read queries `profiles` with `eq('id', userId)`
- Write updates and propagates errors
- Round-trip off → on → off

### 4. Chat stream wire-up (`src/routes/api/chat/chat.stream.ts`)

After the existing PII detection audit (line ~60), insert a redaction
check block that:

1. Calls `getPiiRedactEnabled(supabase, userId)` (wrapped in try/catch)
2. If enabled AND `containsPII(body.message)`, sets
   `messageForAi = redactPII(body.message)` and writes the audit log event
3. Uses `messageForAi` in `cacheKey` and `buildChatPayload`
4. Keeps `body.message` for `persistUserMessage`, `checkChatSafety`, and `classifyMessage`

**Tests** (`src/routes/api/__tests__/chat.stream.test.ts`, +6 new tests):

- Toggle off + PII message → no redaction, no audit event
- Toggle on + PII message → persist original, fire redaction event
- Toggle on + clean message → no redaction event
- Profile read fails → chat still responds 200
- Multiple PII kinds → one redaction event, original persisted

Mock infrastructure refactored to expose `mockState.profileData` and
`mockState.auditEventCalls` so each test can assert the redaction
behavior precisely.

### 5. UI toggle (`src/routes/_authenticated/profile.privacy.tsx`)

A new toggle card "Redaksi otomatis data sensitif" added between the
existing "Bantu tingkatkan AI" toggle and the "Unduh data saya" link.

The `getPrivacy` query now also selects `pii_redact_enabled` and the
page reads it as `data.piiRedactEnabled`. A second `useMutation` hook
handles the toggle action, with the same "Tersimpan" success toast and
`invalidateQueries` pattern as the audit toggle.

### 6. Database type sync (`src/integrations/supabase/types.ts`)

Added `pii_redact_enabled: boolean` to `profiles.Row` and
`pii_redact_enabled?: boolean` to `profiles.Insert` + `profiles.Update`.
Regenerate via `supabase gen types typescript` on next deploy for
full sync.

## What this audit did NOT do (deferred)

- **chatSafety Finding 4 → D**: actual ED+co-occurrence→crisis
  escalation. Engineering side (info resources + analytics) shipped in
  `866ffa86`. Auto-escalation is a clinical decision — psychologist
  sign-off required, quarterly review.
- **Fase 5 production hardening** — backup/rollback/monitoring.
- **Manual security cleanup** — revoke old GH PAT + CF token + the
  `sbp_*` token Afif just shared in this session (recommend rotate via
  https://supabase.com/dashboard/account/tokens).

## Verification

| Check                       | Result                                            |
| --------------------------- | ------------------------------------------------- |
| `bunx tsc --noEmit`         | ✓ 0 errors                                        |
| `bun run test`              | ✓ 517/517 (60 files)                              |
| `bun run lint`              | ✓ clean                                           |
| `bun run build`             | ✓ success (29.36s)                                |
| Production Supabase column  | ✓ applied + verified via `information_schema`     |
| Production Supabase comment | ✓ applied + verified via `pg_attribute`           |
| Production deploy (CI 4/4)  | ⏳ running at time of writing — verify in 2-3 min |

## User-facing copy

The toggle is shown in Indonesian:

> **Redaksi otomatis data sensitif**
>
> Saat aktif, nomor telepon, email, KTP/NIK, dan nomor kartu kredit di
> pesan chat akan otomatis disembunyikan sebelum dikirim ke AI. Pesan
> di riwayat chat kamu tetap utuh.

The framing makes three things clear:

1. **What** gets redacted (the 4 PII kinds)
2. **Where** the redaction happens ("sebelum dikirim ke AI" — not on storage)
3. **What is preserved** ("Pesan di riwayat chat kamu tetap utuh")

That third point is critical: a user who turns this on does NOT lose
their chat history. The redaction is a third-party boundary filter, not
a local censor.
