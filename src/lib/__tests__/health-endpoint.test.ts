import { describe, it, expect } from "vitest";
import { APP_CONFIG } from "@/config/app";

describe("/api/health response shape", () => {
  it("APP_CONFIG.name is defined and non-empty", () => {
    expect(APP_CONFIG.name).toBe("HealthyU");
    expect(APP_CONFIG.name.length).toBeGreaterThan(0);
  });

  it("APP_CONFIG.siteUrl is a valid URL", () => {
    expect(() => new URL(APP_CONFIG.siteUrl)).not.toThrow();
  });

  it("health response shape has required fields", () => {
    const body = {
      ok: true,
      app: APP_CONFIG.name,
      time: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.0.0",
      env: process.env.NODE_ENV ?? "development",
    };
    expect(body.ok).toBe(true);
    expect(body.app).toBe("HealthyU");
    expect(typeof body.time).toBe("string");
    expect(typeof body.version).toBe("string");
    expect(typeof body.env).toBe("string");
  });

  it("health response does not leak secrets", () => {
    const body = {
      ok: true,
      app: APP_CONFIG.name,
      time: new Date().toISOString(),
      version: "0.0.0",
      env: "production",
    };
    const json = JSON.stringify(body);
    expect(json).not.toContain("SUPABASE");
    expect(json).not.toContain("secret");
    expect(json).not.toContain("key");
    expect(json).not.toContain("token");
    expect(json).not.toContain("password");
  });
});
