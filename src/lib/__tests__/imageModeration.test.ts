import { describe, it, expect, vi, beforeEach } from "vitest";

const callMock = vi.fn();
vi.mock("../aiGateway.server", () => ({
  callAiWithGuards: (...a: unknown[]) => callMock(...a),
  AiGatewayError: class AiGatewayError extends Error {
    status: number;
    constructor(status: number, msg: string) { super(msg); this.status = status; }
  },
}));

import { moderateImage } from "../imageModeration.server";
import { AiGatewayError } from "../aiGateway.server";

beforeEach(() => callMock.mockReset());

describe("moderateImage", () => {
  it("returns safe when model has no JSON", async () => {
    callMock.mockResolvedValue("no json here");
    const r = await moderateImage("xx");
    expect(r).toEqual({ label: "safe", confidence: 0, blocked: false });
  });

  it("parses JSON and blocks nudity high-confidence", async () => {
    callMock.mockResolvedValue('garbage {"label":"nudity","confidence":0.9,"reason":"x"} tail');
    const r = await moderateImage("xx");
    expect(r.label).toBe("nudity");
    expect(r.blocked).toBe(true);
    expect(r.reason).toBe("x");
  });

  it("does not block when confidence < 0.6", async () => {
    callMock.mockResolvedValue('{"label":"violence","confidence":0.4}');
    const r = await moderateImage("xx");
    expect(r.blocked).toBe(false);
  });

  it("medical_graphic never blocks", async () => {
    callMock.mockResolvedValue('{"label":"medical_graphic","confidence":0.95}');
    const r = await moderateImage("xx");
    expect(r.blocked).toBe(false);
  });

  it("safe label returns blocked=false", async () => {
    callMock.mockResolvedValue('{"label":"safe","confidence":0.99}');
    expect((await moderateImage("xx")).blocked).toBe(false);
  });

  it("fails open on gateway error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    callMock.mockRejectedValue(new AiGatewayError(429, "rate"));
    const r = await moderateImage("xx");
    expect(r).toEqual({ label: "safe", confidence: 0, blocked: false });
    spy.mockRestore();
  });

  it("fails open on generic error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    callMock.mockRejectedValue(new Error("boom"));
    const r = await moderateImage("xx");
    expect(r.label).toBe("safe");
    spy.mockRestore();
  });

  it("forwards image data url and feature to gateway", async () => {
    callMock.mockResolvedValue('{"label":"safe","confidence":1}');
    await moderateImage("AAA", "image/png", "user-1");
    const args = callMock.mock.calls[0][0];
    expect(args.feature).toBe("moderation.image");
    expect(args.userId).toBe("user-1");
    expect(args.skipBudget).toBe(false);
    const userMsg = args.messages[1].content[1];
    expect(userMsg.image_url.url).toBe("data:image/png;base64,AAA");
  });
});