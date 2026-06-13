import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  flattenMessages,
  resolveVexoEndpoint,
  endpointSupportsImage,
} from "@/features/ai/lib/vexoAdapter";

describe("flattenMessages", () => {
  it("returns empty system when only user text", () => {
    const out = flattenMessages([{ role: "user", content: "halo" }]);
    expect(out.text).toBe("halo");
    expect(out.system).toBe("");
    expect(out.imageUrl).toBeUndefined();
  });

  it("joins system messages with double newline", () => {
    const out = flattenMessages([
      { role: "system", content: "kamu adalah ahli gizi" },
      { role: "user", content: "apa itu protein?" },
    ]);
    expect(out.system).toBe("kamu adalah ahli gizi");
    expect(out.text).toBe("apa itu protein?");
  });

  it("concatenates multiple system messages", () => {
    const out = flattenMessages([
      { role: "system", content: "aturan 1" },
      { role: "system", content: "aturan 2" },
      { role: "user", content: "ok" },
    ]);
    expect(out.system).toBe("aturan 1\n\naturan 2");
  });

  it("preserves last user as text, older as history", () => {
    const out = flattenMessages([
      { role: "user", content: "pertanyaan 1" },
      { role: "assistant", content: "jawaban 1" },
      { role: "user", content: "pertanyaan 2" },
    ]);
    expect(out.text).toBe("[user] pertanyaan 1\n[assistant] jawaban 1\n[user] pertanyaan 2");
  });

  it("extracts imageUrl from last user image_url part", () => {
    const out = flattenMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "apa ini?" },
          { type: "image_url", image_url: { url: "https://x.com/y.jpg" } },
        ],
      },
    ]);
    expect(out.text).toBe("apa ini?");
    expect(out.imageUrl).toBe("https://x.com/y.jpg");
  });
});

describe("resolveVexoEndpoint", () => {
  it("maps legacy gemini names to VexoAPI endpoints", () => {
    expect(resolveVexoEndpoint("google/gemini-2.5-flash")).toBe("gptoss120b");
    expect(resolveVexoEndpoint("google/gemini-2.5-flash-lite")).toBe("glm47flash");
    expect(resolveVexoEndpoint("google/gemini-2.5-pro")).toBe("gemini");
  });
  it("passes through canonical VexoAPI names", () => {
    expect(resolveVexoEndpoint("gptoss120b")).toBe("gptoss120b");
    expect(resolveVexoEndpoint("glm47flash")).toBe("glm47flash");
    expect(resolveVexoEndpoint("gemini")).toBe("gemini");
  });
  it("falls back to gptoss120b for unknown models", () => {
    expect(resolveVexoEndpoint("gpt-5")).toBe("gptoss120b");
    expect(resolveVexoEndpoint("")).toBe("gptoss120b");
  });
});

describe("endpointSupportsImage", () => {
  it("only gemini endpoint supports image", () => {
    expect(endpointSupportsImage("gemini")).toBe(true);
    expect(endpointSupportsImage("gptoss120b")).toBe(false);
    expect(endpointSupportsImage("glm47flash")).toBe(false);
  });
});
