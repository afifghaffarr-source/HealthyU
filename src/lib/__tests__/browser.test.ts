import { describe, it, expect } from "vitest";
import {
  isBrowser,
  getSafeLocalStorage,
  getSafeSessionStorage,
  safeMatchMedia,
  readLocalStorage,
  writeLocalStorage,
  removeLocalStorage,
} from "../browser";

describe("browser helpers (jsdom)", () => {
  it("isBrowser true in jsdom", () => {
    expect(isBrowser).toBe(true);
  });
  it("returns Storage objects", () => {
    expect(getSafeLocalStorage()).toBeTruthy();
    expect(getSafeSessionStorage()).toBeTruthy();
  });
  it("safeMatchMedia returns a MQL", () => {
    if (typeof window.matchMedia !== "function") {
      // jsdom may have matchMedia stripped by another test; stub it.
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: () => ({
          matches: false,
          media: "",
          addEventListener() {},
          removeEventListener() {},
        }),
      });
    }
    const mql = safeMatchMedia("(min-width: 1px)");
    expect(mql).not.toBeNull();
  });
  it("write/read/remove roundtrip", () => {
    expect(writeLocalStorage("k1", "v1")).toBe(true);
    expect(readLocalStorage("k1")).toBe("v1");
    expect(removeLocalStorage("k1")).toBe(true);
    expect(readLocalStorage("k1")).toBeNull();
  });
});
