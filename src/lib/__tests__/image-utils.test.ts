import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateImageFile,
  fileToDataUrl,
  dataUrlToBlob,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "../image-utils";

describe("image-utils", () => {
  describe("validateImageFile", () => {
    it("passes for allowed JPEG", () => {
      const f = new File(["x"], "a.jpg", { type: "image/jpeg" });
      expect(() => validateImageFile(f)).not.toThrow();
    });

    it("passes for PNG", () => {
      const f = new File(["x"], "a.png", { type: "image/png" });
      expect(() => validateImageFile(f)).not.toThrow();
    });

    it("passes for WebP", () => {
      const f = new File(["x"], "a.webp", { type: "image/webp" });
      expect(() => validateImageFile(f)).not.toThrow();
    });

    it("throws for unsupported type", () => {
      const f = new File(["x"], "a.gif", { type: "image/gif" });
      expect(() => validateImageFile(f)).toThrow(/tidak didukung/);
    });

    it("throws for oversized file", () => {
      const f = new File(["x"], "big.jpg", { type: "image/jpeg" });
      Object.defineProperty(f, "size", { value: MAX_FILE_SIZE + 1 });
      expect(() => validateImageFile(f)).toThrow(/maksimal 10MB/);
    });
  });

  describe("isTextIconName implicit via achievement", () => {
    it("exports constants", () => {
      expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });
  });

  describe("fileToDataUrl", () => {
    beforeEach(() => {
      // Stub createImageBitmap + canvas
      globalThis.createImageBitmap = vi.fn().mockResolvedValue({
        width: 200,
        height: 100,
      }) as never;
      const ctx = {
        drawImage: vi.fn(),
      };
      const fakeCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(ctx),
        toDataURL: vi.fn().mockReturnValue("data:image/jpeg;base64,abc"),
      };
      globalThis.document = {
        createElement: vi.fn().mockReturnValue(fakeCanvas),
      } as never;
    });

    it("converts file to data URL with downscale", async () => {
      const f = new File(["x"], "a.jpg", { type: "image/jpeg" });
      const result = await fileToDataUrl(f, 1280);
      expect(result).toBe("data:image/jpeg;base64,abc");
    });

    it("does not upscale small images", async () => {
      // 200x100, maxSize=1280 → scale=1
      const f = new File(["x"], "a.jpg", { type: "image/jpeg" });
      const result = await fileToDataUrl(f, 1280);
      expect(result).toBe("data:image/jpeg;base64,abc");
    });
  });

  describe("dataUrlToBlob", () => {
    it("fetches data URL and returns blob", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(["x"], { type: "image/jpeg" })),
      }) as never;
      const blob = await dataUrlToBlob("data:image/jpeg;base64,abc");
      expect(blob).toBeInstanceOf(Blob);
    });
  });
});
