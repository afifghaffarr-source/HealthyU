import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  // Branch coverage: trigger catch paths
  let getItemSpy: ReturnType<typeof vi.spyOn> | undefined;
  let setItemSpy: ReturnType<typeof vi.spyOn> | undefined;
  let removeItemSpy: ReturnType<typeof vi.spyOn> | undefined;

  afterEach(() => {
    getItemSpy?.mockRestore();
    setItemSpy?.mockRestore();
    removeItemSpy?.mockRestore();
  });

  it("getSafeLocalStorage returns null when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    // getSafeLocalStorage itself doesn't throw — it catches internally
    // but jsdom localStorage getter doesn't throw. Test catch via readLocalStorage
    expect(readLocalStorage("trigger")).toBeNull();
    spy.mockRestore();
  });

  it("writeLocalStorage returns false when setItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(writeLocalStorage("k", "v")).toBe(false);
    spy.mockRestore();
  });

  it("removeLocalStorage returns false when removeItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(removeLocalStorage("k")).toBe(false);
    spy.mockRestore();
  });

  it("safeMatchMedia returns null when matchMedia throws", () => {
    const orig = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: () => {
        throw new Error("denied");
      },
    });
    expect(safeMatchMedia("(min-width: 1px)")).toBeNull();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: orig,
    });
  });
});
