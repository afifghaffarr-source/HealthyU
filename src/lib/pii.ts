/**
 * PII detection for chat input.
 *
 * Scans text for personally identifiable information patterns. The chat
 * safety layer (`chatSafety.ts`) detects harmful intent; this module
 * detects sensitive data. Different concern, different keywords.
 *
 * Detected categories:
 * - phone: Indonesian mobile (08xx, +62xx)
 * - email: standard email address
 * - ktp: 16-digit Indonesian national ID (rough check)
 * - credit_card: 13-19 digit card-like number (rough)
 *
 * Design choice: detect only HIGH-CONFIDENCE patterns by default. Lower-
 * confidence patterns (single name, address) require too much context.
 * Caller is expected to present findings to the user, not auto-redact.
 *
 * AUDIT-017 Phase 1 (scoping: docs/audit-017-pii-detection-scoping.md).
 * Future phases: server-side detection, retention policy, redaction.
 */

export type PiiKind = "phone" | "email" | "ktp" | "credit_card";

export type PiiFinding = {
  kind: PiiKind;
  /** The matched text (caller should NOT log this — it's the actual PII) */
  value: string;
  /** Start/end index in the original text (for highlighting) */
  start: number;
  end: number;
};

type Pattern = { kind: PiiKind; re: RegExp };

const PATTERNS: Pattern[] = [
  // Indonesian phone: 08xx-xxxx-xxxx (10-13 digits total) or +62xxxxxxxx
  {
    kind: "phone",
    re: /(?:(?:\+62|62)[\s-]?\d{2,3}[\s-]?\d{3,4}[\s-]?\d{3,4}|0?8\d{2,3}[\s-]?\d{3,4}[\s-]?\d{3,4})/g,
  },
  // Email: standard loose pattern
  { kind: "email", re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  // KTP/NIK: 16 consecutive digits with word boundaries
  { kind: "ktp", re: /\b\d{16}\b/g },
  // Credit card: 13-19 digits with internal spaces/dashes
  { kind: "credit_card", re: /\b(?:\d[\s-]?){12,18}\d\b/g },
];

/**
 * Detect PII in text. Returns array of findings, ordered by start index.
 *
 * Example:
 *   detectPII("Hubungi saya di 081234567890 atau a@b.com")
 *   → [
 *     { kind: "phone", value: "081234567890", start: 14, end: 25 },
 *     { kind: "email", value: "a@b.com", start: 36, end: 42 },
 *   ]
 */
export function detectPII(text: string): PiiFinding[] {
  if (!text) return [];
  const findings: PiiFinding[] = [];
  for (const { kind, re } of PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      findings.push({
        kind,
        value: m[0],
        start: m.index,
        end: m.index + m[0].length,
      });
      // Defensive: avoid infinite loop on zero-width matches
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  findings.sort((a, b) => a.start - b.start);
  return findings;
}

/**
 * High-level helper: returns true if text contains ANY PII.
 * Cheaper than `detectPII(text).length > 0` for the common "should I
 * warn the user?" check.
 */
export function containsPII(text: string): boolean {
  for (const { re } of PATTERNS) {
    re.lastIndex = 0;
    if (re.test(text)) {
      re.lastIndex = 0;
      return true;
    }
  }
  return false;
}

/**
 * Return a list of PII kinds present (deduped, in detection order).
 * Useful for the warning UI: "We detected: phone, email"
 */
export function piiKinds(text: string): PiiKind[] {
  const findings = detectPII(text);
  const seen = new Set<PiiKind>();
  const result: PiiKind[] = [];
  for (const f of findings) {
    if (!seen.has(f.kind)) {
      seen.add(f.kind);
      result.push(f.kind);
    }
  }
  return result;
}
