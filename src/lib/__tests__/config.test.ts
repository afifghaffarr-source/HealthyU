import { describe, it, expect, afterEach } from "vitest";
import { getServerConfig } from "../config.server";

describe("getServerConfig", () => {
  const orig = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = orig;
  });

  it("reads NODE_ENV per call", () => {
    process.env.NODE_ENV = "production";
    expect(getServerConfig().nodeEnv).toBe("production");
    process.env.NODE_ENV = "test";
    expect(getServerConfig().nodeEnv).toBe("test");
  });
});
