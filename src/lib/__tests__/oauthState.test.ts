import { describe, expect, it } from "vitest";
import { oauthStateErrorMessage, validateOAuthState } from "../oauthState";

const base = {
  id: "row-1",
  user_id: "user-1",
  provider: "google_fit",
  expires_at: new Date(Date.now() + 60_000).toISOString(),
  used_at: null,
};

describe("validateOAuthState", () => {
  it("returns missing when row is null", () => {
    expect(validateOAuthState(null, "google_fit")).toEqual({ ok: false, reason: "missing" });
  });
  it("rejects mismatched provider", () => {
    expect(validateOAuthState(base, "fitbit")).toEqual({ ok: false, reason: "wrong_provider" });
  });
  it("rejects already-used state", () => {
    expect(validateOAuthState({ ...base, used_at: new Date().toISOString() }, "google_fit"))
      .toEqual({ ok: false, reason: "used" });
  });
  it("rejects expired state", () => {
    const expired = { ...base, expires_at: new Date(Date.now() - 1000).toISOString() };
    expect(validateOAuthState(expired, "google_fit")).toEqual({ ok: false, reason: "expired" });
  });
  it("accepts a fresh, unused, matching state", () => {
    expect(validateOAuthState(base, "google_fit")).toEqual({
      ok: true,
      userId: "user-1",
      stateId: "row-1",
    });
  });
  it("uses injected now for deterministic expiry checks", () => {
    const fixed = new Date("2026-01-01T00:00:00Z").getTime();
    const row = { ...base, expires_at: "2025-12-31T23:59:00Z" };
    expect(validateOAuthState(row, "google_fit", fixed)).toEqual({ ok: false, reason: "expired" });
  });
});

describe("oauthStateErrorMessage", () => {
  it.each(["missing", "wrong_provider", "used", "expired"] as const)(
    "returns a non-empty string for %s",
    (reason) => {
      expect(oauthStateErrorMessage(reason).length).toBeGreaterThan(0);
    },
  );
});