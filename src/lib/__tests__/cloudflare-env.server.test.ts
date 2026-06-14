import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getEnv, withEnv, withMockedEnv, type CloudflareEnv } from "../cloudflare-env.server";

describe("cloudflare-env", () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    // Save and clear all env vars we might test
    for (const k of [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "VEXO_API_KEY",
      "VAPID_PRIVATE_KEY",
    ]) {
      delete process.env[k];
    }
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
  });

  describe("getEnv()", () => {
    it("returns process.env values when no CF context is set", () => {
      process.env.SUPABASE_URL = "https://from-process.test";
      const env = getEnv();
      expect(env.SUPABASE_URL).toBe("https://from-process.test");
    });

    it("returns empty env when neither context nor process.env has values", () => {
      const env = getEnv();
      expect(env.SUPABASE_URL).toBeUndefined();
    });
  });

  describe("withEnv()", () => {
    it("scopes env access to the wrapped function", () => {
      const cfEnv: CloudflareEnv = {
        SUPABASE_URL: "https://from-cf.test",
        VEXO_API_KEY: "cf-key",
      };

      // First: read inside the scope
      const insideResult = withEnv(cfEnv, () => {
        const env = getEnv();
        return { url: env.SUPABASE_URL, key: env.VEXO_API_KEY };
      });

      // Then: read outside the scope (must NOT leak cfEnv)
      const outsideResult = getEnv();

      expect(insideResult.url).toBe("https://from-cf.test");
      expect(insideResult.key).toBe("cf-key");
      // After withEnv scope ends, getEnv() falls back to process.env
      // (which is empty in the test setup → undefined)
      expect(outsideResult.SUPABASE_URL).toBeUndefined();
    });

    it("merges CF env with process.env (CF wins)", () => {
      process.env.SUPABASE_URL = "https://from-process.test";
      process.env.VEXO_API_KEY = "process-key";

      withEnv({ SUPABASE_URL: "https://from-cf.test" } as CloudflareEnv, () => {
        const env = getEnv();
        // CF overrides process.env
        expect(env.SUPABASE_URL).toBe("https://from-cf.test");
        // Falls through to process.env for unset keys
        expect(env.VEXO_API_KEY).toBe("process-key");
      });
    });
  });

  describe("withMockedEnv()", () => {
    it("provides an env context for tests", () => {
      const result = withMockedEnv(
        { SUPABASE_URL: "https://mocked.test", VEXO_API_KEY: "mock-key" },
        () => ({
          url: getEnv().SUPABASE_URL,
          key: getEnv().VEXO_API_KEY,
        }),
      );
      expect(result.url).toBe("https://mocked.test");
      expect(result.key).toBe("mock-key");
    });
  });

  describe("CF Workers runtime integration", () => {
    it("preserves env across async boundaries", async () => {
      const cfEnv: CloudflareEnv = {
        SUPABASE_URL: "https://cf-async.test",
        VEXO_API_KEY: "cf-async-key",
      };

      const result = await withEnv(cfEnv, async () => {
        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, 10));
        await Promise.resolve();
        // Env should still be in scope
        const env = getEnv();
        return { url: env.SUPABASE_URL, key: env.VEXO_API_KEY };
      });

      expect(result.url).toBe("https://cf-async.test");
      expect(result.key).toBe("cf-async-key");
    });

    it("nested withEnv calls use the innermost context", () => {
      const outer: CloudflareEnv = { SUPABASE_URL: "https://outer.test" };
      const inner: CloudflareEnv = { SUPABASE_URL: "https://inner.test" };

      const result = withEnv(outer, () => {
        const outerUrl = getEnv().SUPABASE_URL;
        const innerUrl = withEnv(inner, () => getEnv().SUPABASE_URL);
        return { outerUrl, innerUrl };
      });

      expect(result.outerUrl).toBe("https://outer.test");
      expect(result.innerUrl).toBe("https://inner.test");
    });
  });

  describe("AsyncLocalStorage isolation", () => {
    it("parallel async tasks see their own env", async () => {
      const taskA = withEnv({ SUPABASE_URL: "https://a.test" } as CloudflareEnv, async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return getEnv().SUPABASE_URL;
      });

      const taskB = withEnv({ SUPABASE_URL: "https://b.test" } as CloudflareEnv, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return getEnv().SUPABASE_URL;
      });

      const [urlA, urlB] = await Promise.all([taskA, taskB]);
      expect(urlA).toBe("https://a.test");
      expect(urlB).toBe("https://b.test");
    });
  });
});
