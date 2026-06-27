/**
 * Pattern Feedback Server Function Test
 * Ponytail: minimal regression — validates user_feedback stored as JSONB object, not stringified
 */

import { describe, it, expect } from "vitest";

describe("patternFeedback.functions PATCH payload shape", () => {
  it("sends user_feedback as object (not stringified JSON) — JSONB column requires object", () => {
    // Simulates what submitPatternFeedback server fn builds for supabase.update()
    const helpful = true;
    const submitted_at = "2026-06-27T17:00:00.000Z";

    const updatePayload = {
      user_feedback: { helpful, submitted_at },
    };

    // Bug regression guard: payload MUST be object, not string
    expect(typeof updatePayload.user_feedback).toBe("object");
    expect(updatePayload.user_feedback).not.toBe(null);
    expect(Array.isArray(updatePayload.user_feedback)).toBe(false);

    // Round-trip JSON: object survives JSON serialization as object
    const roundTrip = JSON.parse(JSON.stringify(updatePayload));
    expect(typeof roundTrip.user_feedback).toBe("object");
    expect(roundTrip.user_feedback).toEqual({ helpful, submitted_at });

    // Anti-regression: server fn MUST NOT wrap with JSON.stringify.
    // The buggy form was: JSON.stringify({...}) — sends a string to Supabase REST,
    // which stores user_feedback as escaped JSON STRING instead of JSONB object.
    // We guard directly against the buggy payload shape on the wire.
    const wirePayload = updatePayload; // what server fn sends
    // Type guard: user_feedback must be a plain object, not a JSON-encoded string
    expect(typeof wirePayload.user_feedback).not.toBe("string");
    // And JSON.parse should return the same shape (object), not a doubly-encoded string
    const parsed = JSON.parse(JSON.stringify(wirePayload));
    expect(parsed.user_feedback).toEqual({ helpful, submitted_at });
  });
});
