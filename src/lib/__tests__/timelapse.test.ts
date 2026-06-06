import { describe, it, expect, vi, afterEach } from "vitest";
import { generateTimelapse } from "../timelapse";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("generateTimelapse", () => {
  it("throws when fewer than 2 photos", async () => {
    await expect(generateTimelapse([])).rejects.toThrow(/minimal 2 foto/);
    await expect(generateTimelapse([{ url: "x", taken_at: "2025-01-01" }])).rejects.toThrow(
      /minimal 2 foto/,
    );
  });

  it("throws when MediaRecorder is unavailable", async () => {
    vi.stubGlobal("MediaRecorder", undefined);
    await expect(
      generateTimelapse([
        { url: "a", taken_at: "2025-01-01" },
        { url: "b", taken_at: "2025-01-02" },
      ]),
    ).rejects.toThrow(/MediaRecorder/);
  });
});
