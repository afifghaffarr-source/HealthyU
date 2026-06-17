import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getEnv,
  withEnv,
  withMockedEnv,
  normalizeCfEnv,
  type CloudflareEnv,
} from "../cloudflare-env.server";

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

  /**
   * BUG FIX: wrangler 4.100.0 --var "KEY=VALUE" stores the literal
   * "KEY=VALUE" string as a key, accumulating across deploys. The
   * normalizeCfEnv helper defends against this at read time.
   *
   * See src/lib/cloudflare-env.server.ts normalizeCfEnv() for the
   * full background on the wrangler quirk.
   */
  describe("normalizeCfEnv()", () => {
    it("returns empty object for null/undefined input", () => {
      expect(normalizeCfEnv(null)).toEqual({});
      expect(normalizeCfEnv(undefined)).toEqual({});
    });

    it("preserves clean keys unchanged", () => {
      const env: CloudflareEnv = {
        SUPABASE_URL: "https://x.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_pub_abc",
      };
      expect(normalizeCfEnv(env)).toEqual({
        SUPABASE_URL: "https://x.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "sb_pub_abc",
      });
    });

    it("strips '=' suffix from weird keys", () => {
      // Simulates wrangler --var "GIT_SHA=abc123" producing a literal
      // "GIT_SHA=abc123" key.
      const env = {
        "GIT_SHA=abc123": true,
        "DEPLOYED_BY=afifghaffarr-source": true,
      } as unknown as CloudflareEnv;
      const result = normalizeCfEnv(env);
      expect(result).toEqual({
        GIT_SHA: true,
        DEPLOYED_BY: true,
      });
    });

    it("prefers clean key over weird key for same name", () => {
      const env = {
        GIT_SHA: "clean-value",
        "GIT_SHA=weird-value": true,
      } as unknown as CloudflareEnv;
      const result = normalizeCfEnv(env);
      expect(result.GIT_SHA).toBe("clean-value");
    });

    it("keeps first occurrence when multiple weird keys share a name", () => {
      // Simulates 18 deploys each adding a new "GIT_SHA=<sha>" entry.
      const env = {
        "GIT_SHA=deploy-1": "v1",
        "GIT_SHA=deploy-2": "v2",
        "GIT_SHA=deploy-3": "v3",
      } as unknown as CloudflareEnv;
      const result = normalizeCfEnv(env);
      expect(result.GIT_SHA).toBe("v1");
    });

    it("mixes clean and weird keys correctly", () => {
      const env = {
        CRON_SECRET: "secret",
        "GIT_SHA=abc": "v1",
        "GIT_SHA=def": "v2",
        DEBUG_ENV_TRACE: "1",
        "DEPLOYED_BY=afif": "actor",
      } as unknown as CloudflareEnv;
      const result = normalizeCfEnv(env);
      expect(result).toEqual({
        CRON_SECRET: "secret",
        GIT_SHA: "v1",
        DEBUG_ENV_TRACE: "1",
        DEPLOYED_BY: "actor",
      });
    });
  });

  /**
   * Integration: getEnv() must surface normalized values to callers,
   * even when the underlying AsyncLocalStorage env has the wrangler
   * weirdness.
   */
  describe("getEnv() with wrangler weird keys", () => {
    it("returns the parsed key for getEnvVar('GIT_SHA') when env has 'GIT_SHA=<sha>'", () => {
      withEnv(
        {
          "GIT_SHA=abc123": "v1",
          "DEPLOYED_BY=afif": "actor",
        } as unknown as CloudflareEnv,
        () => {
          const env = getEnv();
          expect(env.GIT_SHA).toBe("v1");
          expect(env.DEPLOYED_BY).toBe("actor");
        },
      );
    });

    it("clean GIT_SHA wins over weird GIT_SHA=<sha> when both are present", () => {
      withEnv(
        {
          GIT_SHA: "clean-sha",
          "GIT_SHA=weird": "ignored",
        } as unknown as CloudflareEnv,
        () => {
          expect(getEnv().GIT_SHA).toBe("clean-sha");
        },
      );
    });
  });
});
