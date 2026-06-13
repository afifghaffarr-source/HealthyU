// Tests for src/lib/env.ts — environment validation.
//
// The env module validates at import time (fail-fast on misconfigured
// deploys). These tests directly exercise the validators rather than
// going through the module-level boot path, because the boot path is
// gated by `typeof window === "undefined"` and jsdom has a window.

import { describe, expect, it } from "vitest";
import { validateClientEnv, validateServerEnv } from "../env";

const VALID_CLIENT = {
  VITE_SUPABASE_URL: "https://abc.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "eyJhbG...test",
  VITE_SUPABASE_PROJECT_ID: "abc",
} as const;

const VALID_SERVER = {
  SUPABASE_URL: "https://abc.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "eyJhbG...test",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  VEXO_API_KEY: "VEXO_TEST_KEY_xxxxxxxxxxxxxxxx",
  CRON_SECRET: "x".repeat(32),
} as const;

describe("validateClientEnv — happy path", () => {
  it("accepts a fully-populated client env", () => {
    const result = validateClientEnv(VALID_CLIENT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.VITE_SUPABASE_URL).toBe(VALID_CLIENT.VITE_SUPABASE_URL);
    }
  });
});

describe("validateClientEnv — failures", () => {
  it("rejects a malformed URL", () => {
    const result = validateClientEnv({
      ...VALID_CLIENT,
      VITE_SUPABASE_URL: "not-a-url",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.issues[0].message).toMatch(/must be a valid URL/);
    }
  });

  it("rejects a non-Supabase publishable key", () => {
    const result = validateClientEnv({
      ...VALID_CLIENT,
      VITE_SUPABASE_PUBLISHABLE_KEY: "wrong-prefix-key",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an empty project id", () => {
    const result = validateClientEnv({
      ...VALID_CLIENT,
      VITE_SUPABASE_PROJECT_ID: "",
    });
    expect(result.ok).toBe(false);
  });
});

describe("validateServerEnv — happy path", () => {
  it("accepts a fully-populated server env", () => {
    const result = validateServerEnv(VALID_SERVER);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // VEXO_BASE_URL has a default
      expect(result.data.VEXO_BASE_URL).toBe("https://vexoapi.dev");
    }
  });
});

describe("validateServerEnv — failures", () => {
  it("rejects a missing SUPABASE_URL", () => {
    const { SUPABASE_URL: _, ...rest } = VALID_SERVER;
    const result = validateServerEnv(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.issues[0].path).toContain("SUPABASE_URL");
    }
  });

  it("rejects a CRON_SECRET shorter than 32 chars", () => {
    const result = validateServerEnv({ ...VALID_SERVER, CRON_SECRET: "short" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.issues[0].message).toMatch(/at least 32 chars/);
    }
  });

  it("rejects a VEXO_API_KEY that doesn't look like a Vexo key", () => {
    const result = validateServerEnv({ ...VALID_SERVER, VEXO_API_KEY: "short" });
    expect(result.ok).toBe(false);
  });

  it("reports multiple errors at once", () => {
    const result = validateServerEnv({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // Should have at least 5 issues (URL, key, role key, vexo key, cron secret)
      expect(result.error.issues.length).toBeGreaterThanOrEqual(5);
    }
  });
});
