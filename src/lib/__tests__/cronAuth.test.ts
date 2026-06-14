import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireCronSecret } from "../cronAuth.server";
import { withMockedEnv } from "../cloudflare-env.server";

const SECRET = "x".repeat(32);

describe("requireCronSecret", () => {
  const orig = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
  });
  afterEach(() => {
    process.env.CRON_SECRET = orig;
  });

  it("returns 500 when secret unset", async () => {
    delete process.env.CRON_SECRET;
    const res = requireCronSecret(new Request("http://x"));
    expect(res?.status).toBe(500);
  });

  it("returns 500 when secret too short", () => {
    process.env.CRON_SECRET = "short";
    const res = requireCronSecret(new Request("http://x"));
    expect(res?.status).toBe(500);
  });

  it("rejects missing header with 401", () => {
    const res = requireCronSecret(new Request("http://x"));
    expect(res?.status).toBe(401);
  });

  it("rejects wrong secret with 401", () => {
    const res = requireCronSecret(
      new Request("http://x", { headers: { "x-cron-secret": "y".repeat(32) } }),
    );
    expect(res?.status).toBe(401);
  });

  it("accepts via x-cron-secret header", () => {
    const res = requireCronSecret(
      new Request("http://x", { headers: { "x-cron-secret": SECRET } }),
    );
    expect(res).toBeNull();
  });

  it("accepts via authorization Bearer", () => {
    const res = requireCronSecret(
      new Request("http://x", { headers: { authorization: `Bearer ${SECRET}` } }),
    );
    expect(res).toBeNull();
  });

  it("rejects same-length wrong secret with 401 (timing-safe)", () => {
    const wrong = SECRET.slice(0, -1) + "y";
    const res = requireCronSecret(new Request("http://x", { headers: { "x-cron-secret": wrong } }));
    expect(res?.status).toBe(401);
  });

  // New env pattern: withMockedEnv sets a CF env context that getEnv() reads.
  // This is the production-style way to test env-dependent code; the existing
  // tests above use process.env for backwards-compat coverage.
  it("accepts via withMockedEnv (CF env pattern)", () => {
    const res = withMockedEnv({ CRON_SECRET: SECRET }, () =>
      requireCronSecret(new Request("http://x", { headers: { "x-cron-secret": SECRET } })),
    );
    expect(res).toBeNull();
  });

  it("returns 500 when CRON_SECRET missing in withMockedEnv", () => {
    // withMockedEnv merges with process.env; explicitly clear first.
    const res = withMockedEnv({ CRON_SECRET: "" }, () =>
      requireCronSecret(new Request("http://x")),
    );
    expect(res?.status).toBe(500);
  });
});
