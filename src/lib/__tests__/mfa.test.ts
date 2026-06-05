import { describe, it, expect, vi, beforeEach } from "vitest";

const { mfa } = vi.hoisted(() => ({
  mfa: {
    listFactors: vi.fn(),
    enroll: vi.fn(),
    challenge: vi.fn(),
    verify: vi.fn(),
    unenroll: vi.fn(),
    getAuthenticatorAssuranceLevel: vi.fn(),
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { mfa } },
}));

import {
  listFactors,
  enrollTotp,
  verifyTotpEnroll,
  unenrollFactor,
  challengeTotp,
  verifyTotpChallenge,
  getAuthenticatorLevel,
} from "../mfa";

beforeEach(() => {
  Object.values(mfa).forEach((m) => m.mockReset());
});

describe("listFactors", () => {
  it("returns data on success", async () => {
    mfa.listFactors.mockResolvedValue({ data: { all: [] }, error: null });
    expect(await listFactors()).toEqual({ all: [] });
  });
  it("throws on error", async () => {
    mfa.listFactors.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(listFactors()).rejects.toThrow("boom");
  });
});

describe("enrollTotp", () => {
  it("maps response into factorId/qrSvg/secret/uri", async () => {
    mfa.enroll.mockResolvedValue({
      data: { id: "f1", totp: { qr_code: "<svg/>", secret: "S", uri: "otp://" } },
      error: null,
    });
    const r = await enrollTotp("MyApp");
    expect(mfa.enroll).toHaveBeenCalledWith({ factorType: "totp", friendlyName: "MyApp" });
    expect(r).toEqual({ factorId: "f1", qrSvg: "<svg/>", secret: "S", uri: "otp://" });
  });
  it("uses default friendly name", async () => {
    mfa.enroll.mockResolvedValue({
      data: { id: "f1", totp: { qr_code: "", secret: "", uri: "" } },
      error: null,
    });
    await enrollTotp();
    expect(mfa.enroll.mock.calls[0][0].friendlyName).toBe("HealthyU Authenticator");
  });
  it("throws on error", async () => {
    mfa.enroll.mockResolvedValue({ data: null, error: new Error("nope") });
    await expect(enrollTotp()).rejects.toThrow("nope");
  });
});

describe("verifyTotpEnroll", () => {
  it("challenges then verifies with same factor + challenge id", async () => {
    mfa.challenge.mockResolvedValue({ data: { id: "c1" }, error: null });
    mfa.verify.mockResolvedValue({ data: { access_token: "t" }, error: null });
    const r = await verifyTotpEnroll("f1", "123456");
    expect(mfa.challenge).toHaveBeenCalledWith({ factorId: "f1" });
    expect(mfa.verify).toHaveBeenCalledWith({ factorId: "f1", challengeId: "c1", code: "123456" });
    expect(r).toEqual({ access_token: "t" });
  });
  it("propagates challenge error", async () => {
    mfa.challenge.mockResolvedValue({ data: null, error: new Error("ch") });
    await expect(verifyTotpEnroll("f1", "1")).rejects.toThrow("ch");
    expect(mfa.verify).not.toHaveBeenCalled();
  });
  it("propagates verify error", async () => {
    mfa.challenge.mockResolvedValue({ data: { id: "c1" }, error: null });
    mfa.verify.mockResolvedValue({ data: null, error: new Error("bad code") });
    await expect(verifyTotpEnroll("f1", "999")).rejects.toThrow("bad code");
  });
});

describe("unenrollFactor / challengeTotp / verifyTotpChallenge / getAuthenticatorLevel", () => {
  it("unenrollFactor returns data", async () => {
    mfa.unenroll.mockResolvedValue({ data: { id: "f1" }, error: null });
    expect(await unenrollFactor("f1")).toEqual({ id: "f1" });
  });
  it("challengeTotp returns only id", async () => {
    mfa.challenge.mockResolvedValue({ data: { id: "c9" }, error: null });
    expect(await challengeTotp("f1")).toBe("c9");
  });
  it("verifyTotpChallenge passes through", async () => {
    mfa.verify.mockResolvedValue({ data: { ok: true }, error: null });
    const r = await verifyTotpChallenge("f1", "c1", "111");
    expect(mfa.verify).toHaveBeenCalledWith({ factorId: "f1", challengeId: "c1", code: "111" });
    expect(r).toEqual({ ok: true });
  });
  it("getAuthenticatorLevel returns level data", async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: "aal1", nextLevel: "aal2" },
      error: null,
    });
    expect(await getAuthenticatorLevel()).toEqual({ currentLevel: "aal1", nextLevel: "aal2" });
  });
  it("getAuthenticatorLevel throws on error", async () => {
    mfa.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: null, error: new Error("x") });
    await expect(getAuthenticatorLevel()).rejects.toThrow("x");
  });
});