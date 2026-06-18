-- AUDIT-019 — PII redaction toggle for chat.
--
-- Adds a per-user opt-in flag. When enabled, the chat stream runs the
-- user's message through redactPII() before sending it to the AI. The
-- original is still persisted in chat_messages — only the AI boundary
-- sees the redacted text. See:
--   docs/audit-019-pii-redaction-toggle.md
--   src/lib/pii.ts (redactPII)
--   src/routes/api/chat/chat.stream.ts (enforcement point)
--
-- Default = false (opt-in). Privacy is opt-in for advanced features
-- per the project's privacy policy (/privacy).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pii_redact_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.pii_redact_enabled IS
  'AUDIT-019: when true, the chat stream redacts PII (phone, email, KTP, credit card) from the user message BEFORE sending to the AI. The original is still stored in chat_messages — only the AI boundary sees the redacted version. Default false (opt-in).';
