import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Route } from "../health";

/**
 * AUDIT-016: Integration tests for /api/health route.
 *
 * Health endpoint is the simplest API route but it's also the one we lean on
 * in deploy smoke tests — it MUST work even when env vars are missing (e.g.
 * during a partially-deployed state). Tests cover:
 *
 * 1. Happy path: returns 200 + JSON with expected shape
 * 2. Response headers: content-type + cache-control
 * 3. Field-level: app name, time (ISO-8601), version, env fallback
 * 4. Resilience: works without CF env (process.env only)
 */
describe("/api/health", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVersion = process.env.npm_package_version;

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.npm_package_version;
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
    else delete process.env.NODE_ENV;
    if (originalVersion !== undefined) process.env.npm_package_version = originalVersion;
    else delete process.env.npm_package_version;
  });

  function getHandler() {
    // The route is registered via createFileRoute which returns a Route
    // object with `server.handlers.GET` as the actual handler.
    const handler = (
      Route as unknown as {
        options: { server: { handlers: { GET: (opts: unknown) => Promise<Response> } } };
      }
    ).options.server.handlers.GET;
    return handler;
  }

  it("returns 200 OK", async () => {
    const handler = getHandler();
    const res = await handler({});
    expect(res.status).toBe(200);
  });

  it("returns valid JSON with required fields", async () => {
    const handler = getHandler();
    const res = await handler({});
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: true,
      app: expect.any(String),
      time: expect.any(String),
      version: expect.any(String),
      env: expect.any(String),
    });
  });

  it("includes app name from APP_CONFIG", async () => {
    const handler = getHandler();
    const res = await handler({});
    const body = (await res.json()) as { app: string };
    expect(body.app).toBe("HealthyU");
  });

  it("time field is ISO-8601", async () => {
    const handler = getHandler();
    const res = await handler({});
    const body = (await res.json()) as { time: string };
    expect(() => new Date(body.time).toISOString()).not.toThrow();
    expect(body.time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("falls back to '0.0.0' when npm_package_version is not set", async () => {
    const handler = getHandler();
    const res = await handler({});
    const body = (await res.json()) as { version: string };
    expect(body.version).toBe("0.0.0");
  });

  it("uses npm_package_version when set", async () => {
    process.env.npm_package_version = "1.2.3";
    const handler = getHandler();
    const res = await handler({});
    const body = (await res.json()) as { version: string };
    expect(body.version).toBe("1.2.3");
  });

  it("falls back to 'development' when NODE_ENV is not set", async () => {
    const handler = getHandler();
    const res = await handler({});
    const body = (await res.json()) as { env: string };
    expect(body.env).toBe("development");
  });

  it("uses NODE_ENV when set", async () => {
    process.env.NODE_ENV = "production";
    const handler = getHandler();
    const res = await handler({});
    const body = (await res.json()) as { env: string };
    expect(body.env).toBe("production");
  });

  it("sends content-type application/json header", async () => {
    const handler = getHandler();
    const res = await handler({});
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("disables caching via Cache-Control: no-store", async () => {
    const handler = getHandler();
    const res = await handler({});
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("works even when CF env is empty (no getEnv() dependency)", async () => {
    // Health endpoint must NOT depend on CF env (it doesn't import
    // cloudflare-env.server). This is a smoke-test safety: deploy
    // verification works even if env vars drift.
    // We assert this by NOT calling getEnv() and confirming the route
    // resolves without env.
    const handler = getHandler();
    const res = await handler({});
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
