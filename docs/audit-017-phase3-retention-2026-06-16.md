# AUDIT-017 Phase 3 — Chat Retention Policy (2026-06-16)

> **Status:** ✅ DONE
> **Source:** AUDIT-017 Phase 3 from `docs/audit-017-pii-detection-scoping.md`
> **Commits:** (3 commits pushed, see git log)
> **Migration:** `supabase/migrations/20260616123743_audit_017_chat_retention.sql`

## Problem

Chat messages are stored permanently in `public.chat_messages` (RLS-enabled, but no retention policy). A user who shared PII (phone, KTP, etc.) 2 years ago still has it in our database, and Indonesia UU PDP 2022 requires data minimization.

## Design Decision: opt-in (not opt-out)

**Chose: opt-in retention, default = keep forever.**

This **deviates from the original scoping doc** which said "90 days default with opt-in for keep forever". Reason: the existing `src/routes/api/public/hooks/data-retention.ts` already established a strong project policy:

> "User health data (meal_logs, water_logs, vitals_logs, etc.) is NEVER auto-deleted — that requires explicit user consent per UU PDP."

Auto-deleting a user's chat without their explicit consent would:

- Contradict the existing project policy
- Risk user complaints ("I lost my chat history!")
- Be a UU PDP compliance gray area (consent must be informed and explicit)

So retention is opt-in. Default = forever. Users who explicitly set a retention period get auto-purge.

## What Was Built

### 1. Schema (`supabase/migrations/20260616123743_audit_017_chat_retention.sql`)

- `profiles.chat_retention_days INT` (NULL = forever, else 30-3650)
- CHECK constraint enforces valid range
- `purge_user_chats(p_user_id UUID, p_retention_days INT) RETURNS INT` SQL function (SECURITY DEFINER, service_role-only)

### 2. Server helpers (`src/features/chat/lib/`)

- `chatRetention.ts` — client + server safe: types, constants, validator
- `chatRetention.server.ts` — server-only: `getChatRetention`, `setChatRetention`, `enforceRetentionAfterWrite`

### 3. Wire into chat send flow (`chatPrompt.server.ts`)

`persistUserMessage` now calls `enforceRetentionAfterWrite(supabase, userId)` after inserting. On-write check, no cron needed:

- Pros: simpler infra, no missed runs, idempotent per write
- Cons: 1 extra query per chat send (only for users with retention set)

### 4. Server functions (`chat.functions.ts`)

- `getChatRetention` (GET) — returns `{ days: number }` (0 = forever)
- `setChatRetention` (POST) — accepts `{ days: number }`, validates server-side

### 5. UI page (`src/features/pengaturan/routes/PengaturanChatPage.tsx` + `src/routes/_authenticated/pengaturan.chat.tsx`)

- 5-option radio selector: "Simpan selamanya" / 30 / 90 / 180 / 365 days
- "Hapus semua chat sekarang" button → ConfirmDialog → `clearChatHistory` (pre-existing server function)
- Linked from chat page via "Pengaturan" text link next to SafetyChip

### 6. Tests

- `chatRetention.test.ts` — 14 tests for the public client+server API
- `chatRetention.server.test.ts` — 10 tests for the server module (mocked supabase)
- Total: 24 new tests, 400/400 pass

## What Was NOT Built (deferred)

- **pg_cron schedule** — on-write check made it unnecessary
- **Right-to-access (data export)** — separate audit (AUDIT-018) per Afif's decision
- **Cross-feature retention** (meal_logs, water_logs, etc.) — not in scope, would need its own audit
- **Audit log of purges** — not in scope, but easy to add (just `log_audit_event("chat.purged", ...)` inside `enforceRetentionAfterWrite`)

## Operational Notes

### For deployment (next time Afif deploys)

1. Run the migration: `supabase db push` (or apply via dashboard SQL editor)
2. Regenerate Supabase types: `supabase gen types typescript --local > src/integrations/supabase/types.ts`
3. The `LooseSB` cast in `chatRetention.server.ts` will then be unneeded

### For monitoring (later)

If purge volume needs to be tracked, add a `log_audit_event("chat.purged", "chat", null, { deleted: N, days: D })` call inside `enforceRetentionAfterWrite`. Skipped for now to keep this PR small.

## Risk Assessment

| Risk                                                                 | Likelihood | Mitigation                                                                         |
| -------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| User reports lost chat history                                       | Low        | Default is forever; only happens if user explicitly set retention                  |
| Purge RPC failure breaks chat                                        | Very low   | Errors swallowed in `enforceRetentionAfterWrite`; next send retries                |
| Malicious retention set (e.g., user sets retention=1 to wipe others) | None       | RLS prevents it; retention is per-user only                                        |
| Race condition between insert + purge                                | Very low   | Both run in same handler; user can only see their own data                         |
| Schema migration breaks existing profiles                            | Very low   | `ADD COLUMN IF NOT EXISTS` is safe; CHECK constraint allows NULL for existing rows |

## Lessons

1. **Always read existing project policy before designing a new feature.** The opt-out default from the scoping doc would have contradicted the existing `data-retention.ts` comment. Saved a rollback.
2. **The `Database` type from Supabase is auto-generated, not source-controlled for new columns.** Use a local cast (`LooseSB`) to keep CI green between migration apply + type regen. This is the existing project pattern (see other server modules).
3. **On-write check beats cron for low-volume user actions.** Chat sends are bounded by rate limiting (30/min). 1 extra query per send is negligible vs. managing a separate cron infra + missed-run edge cases.
