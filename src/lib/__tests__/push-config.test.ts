import { describe, it, expect } from "vitest";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "../push-config";

describe("VAPID_PUBLIC_KEY", () => {
  it("decodes to 65-byte uncompressed P-256 point", () => {
    const buf = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    expect(buf.length).toBe(65);
    expect(buf[0]).toBe(0x04);
  });
});

describe("urlBase64ToUint8Array", () => {
  it("decodes standard text roundtrip", () => {
    // 'hello' = 'aGVsbG8' (urlsafe, no padding)
    const u = urlBase64ToUint8Array("aGVsbG8");
    expect(new TextDecoder().decode(u)).toBe("hello");
  });
  it("handles url-safe chars - and _", () => {
    // bytes [0xfb, 0xff] => standard b64 '+/8=' => urlsafe '-_8'
    const u = urlBase64ToUint8Array("-_8");
    expect(Array.from(u)).toEqual([0xfb, 0xff]);
  });
  it("handles missing padding", () => {
    expect(urlBase64ToUint8Array("YQ").length).toBe(1);
    expect(urlBase64ToUint8Array("YWI").length).toBe(2);
    expect(urlBase64ToUint8Array("YWJj").length).toBe(3);
  });
});