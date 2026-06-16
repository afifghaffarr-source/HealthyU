# AUDIT-017 — PII Detection in Chat Input (Scoping)

> **Date:** 2026-06-16
> **Source:** Finding 5 from `docs/chatSafety-review-2026-06-16.md`
> **Severity:** Low (privacy, not safety) → Medium if data breach occurs
> **Status:** 📋 Scoped, not yet implemented

## Problem

The chat_messages table stores user-typed content as-is. If a user pastes personally identifiable information (PII) into the chat, it gets stored permanently:

- Phone numbers (08xx, +62, etc.)
- KTP/NIK (16-digit Indonesian national ID)
- Email addresses
- Credit card numbers
- Home addresses
- Medical record numbers
- Date of birth
- BPJS number

This content is also sent to the VexoAPI upstream for AI processing. We have no way to redact or warn the user before it leaves our infrastructure.

**Current state of chat_messages table** (from migration `20260603045312_*`):

- Columns: `id, user_id, role, content, created_at`
- RLS: enabled (users can only see their own messages)
- No PII detection, no redaction, no retention policy

## Why This Matters

1. **User privacy**: many users don't realize their data is permanently stored
2. **Breach risk**: if Supabase is breached, all chat PII leaks
3. **Compliance**: Indonesia PDP Law (UU PDP 2022) requires data minimization
4. **Trust**: users paste sensitive data in chat expecting it to be ephemeral, not stored

## Approach Options

### Option A: Client-side warning + redact before send (RECOMMENDED)

- Add PII detection in the chat input component
- Before sending, scan the text for PII patterns
- If PII detected, show a warning dialog: "We detected a phone number/email/etc. Continue anyway?"
- User can confirm → message sent as-is
- User can edit → message modified

**Pros:** User is informed, has choice, friction is low
**Cons:** User might still click "send anyway" without reading

### Option B: Server-side detect + log warning

- Detect PII on server in chat.functions.ts
- Log to errorReporting when PII detected
- Don't block, just audit
- Add a "data export" feature later so user can review and delete

**Pros:** Catches cases where client skipped the check (e.g., older app version)
**Cons:** PII still stored, just audited

### Option C: Server-side redact before storage

- Detect PII on server
- Replace with placeholder: `[PHONE_REDACTED]`, `[EMAIL_REDACTED]`
- Store the redacted version in chat_messages
- AI gets the redacted version too

**Pros:** PII never persisted
**Cons:** AI responses may be wrong if it doesn't know user's email when needed
**Cons:** User might be confused why their data is missing from chat history

### Option D: Retention policy (delete after N days)

- Keep chat for N days, then auto-purge
- User can opt-out for "save my chats" feature

**Pros:** Bound the data exposure
**Cons:** Users lose chat history
**Cons:** Doesn't address the leak during the retention period

## Recommended Approach

**Option A (primary) + Option D (secondary)**:

1. Client-side PII detection with warning dialog (Option A)
2. Add data retention policy: 90 days auto-purge for chat_messages (Option D)
3. User can opt-in to "save my chats" for unlimited retention

This balances:

- User awareness (A)
- Data minimization (D)
- User choice (opt-in for long retention)

## PII Patterns to Detect

For Indonesian context, the priority list is:

| Pattern                      | Regex (simplified)                                               | False-positive risk                              |
| ---------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| Indonesian phone (08xx, +62) | `/(?:\\+62\|08)\\d{8,12}/g`                                      | Low — phone numbers rare in nutrition context    |
| KTP/NIK (16 digits)          | `/\\b\\d{16}\\b/g`                                               | Medium — could be 16-digit ID like order numbers |
| Email                        | `/[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}/gi`                     | Low — emails are clearly identifiable            |
| Credit card (13-19 digits)   | `/\\b\\d{13,19}\\b/g`                                            | High — overlaps with NIK, order numbers          |
| BPJS (13 digits)             | `/\\b\\d{13}\\b/g`                                               | High — overlap with credit card                  |
| URL with PII                 | `/(?:https?:\\/\\/)?(?:www\\.)?[a-z0-9-]+\\.[a-z]{2,}[^\\s]*/gi` | Medium — URLs are sometimes legit                |

**Strategy**: detect with high-confidence patterns first (email, phone), then progressively add riskier ones.

## Implementation Phases

### Phase 1: Minimal viable warning (S, 1-2 days)

- Add `src/lib/pii.ts` with regex patterns
- Add warning dialog in chat input component
- Only detect high-confidence: phone, email
- Log detected PII (without storing the value) to errorReporting for monitoring
- Unit tests for regex patterns

### Phase 2: Extend detection (M, 3-4 days)

- Add KTP, credit card, BPJS detection
- Add server-side detection in chat.functions.ts
- Audit log of PII detections
- Dashboard for user to see "we detected X in your last message"

### Phase 3: Retention policy (M, 2-3 days)

- Add `purge_old_chats` cron job (90 days default)
- User setting to opt-out (keep forever)
- Add `purge_user_data` to comply with right-to-delete
- Add `export_user_data` to comply with right-to-access

### Phase 4: Redaction (L, optional, defer)

- Server-side redaction for high-risk patterns
- User-facing toggle: "redact PII from AI responses"
- "Privacy mode" for sensitive topics

## Out of Scope (defer)

- AI model redaction (PII leaking to VexoAPI) — separate concern
- Image OCR PII detection (photos of KTP) — separate audit
- Voice transcription PII — out of scope (no voice feature)
- Cross-feature PII (profile, settings, scan results) — separate audit per feature

## Action Items (this PR)

This is a scoping document. Implementation requires user approval on approach (A, B, C, D, or combination) and priority.

Recommend starting with **Phase 1** (client-side warning for phone + email) as a low-risk first step.

## References

- Source: `docs/chatSafety-review-2026-06-16.md` Finding 5
- Schema: `supabase/migrations/20260603045312_*` (chat_messages)
- Schema: `supabase/migrations/20260604035041_*` (ai_usage_logs)
- Law: Indonesia UU PDP (Pelindungan Data Pribadi) 2022
