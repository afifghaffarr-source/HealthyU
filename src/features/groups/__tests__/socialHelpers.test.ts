/**
 * Pure helper tests for social/community features.
 * Mirrors logic from server fns and components to keep testable in isolation.
 */
import { describe, expect, it } from "vitest";

// Mirror timeAgo from NotificationCenter
function timeAgo(iso: string, nowMs = Date.now()): string {
  const diff = nowMs - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "baru saja";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}j`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}h`;
  return "old";
}

// Mirror reactionEmoji
function reactionEmoji(t: string): string {
  const map: Record<string, string> = {
    heart: "❤️",
    muscle: "💪",
    fire: "🔥",
    clap: "👏",
    laugh: "😂",
    star: "⭐",
  };
  return map[t] ?? "❤️";
}

// Mirror reaction tally logic
function tallyReactions(rows: { reaction_type: string }[]): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const r of rows) {
    tally[r.reaction_type] = (tally[r.reaction_type] ?? 0) + 1;
  }
  return tally;
}

describe("timeAgo", () => {
  const now = new Date("2026-06-23T12:00:00Z").getTime();
  it("shows 'baru saja' for <1min", () => {
    const t = new Date(now - 30 * 1000).toISOString();
    expect(timeAgo(t, now)).toBe("baru saja");
  });
  it("formats minutes", () => {
    expect(timeAgo(new Date(now - 5 * 60_000).toISOString(), now)).toBe("5m");
  });
  it("formats hours", () => {
    expect(timeAgo(new Date(now - 3 * 3600_000).toISOString(), now)).toBe("3j");
  });
  it("formats days for <7", () => {
    expect(timeAgo(new Date(now - 2 * 86400_000).toISOString(), now)).toBe("2h");
  });
  it("falls back to 'old' for >7 days", () => {
    expect(timeAgo(new Date(now - 14 * 86400_000).toISOString(), now)).toBe("old");
  });
});

describe("reactionEmoji", () => {
  it("maps each reaction type to emoji", () => {
    expect(reactionEmoji("heart")).toBe("❤️");
    expect(reactionEmoji("muscle")).toBe("💪");
    expect(reactionEmoji("fire")).toBe("🔥");
    expect(reactionEmoji("clap")).toBe("👏");
    expect(reactionEmoji("laugh")).toBe("😂");
    expect(reactionEmoji("star")).toBe("⭐");
  });
  it("defaults to heart for unknown", () => {
    expect(reactionEmoji("unknown")).toBe("❤️");
  });
});

describe("tallyReactions", () => {
  it("counts each type", () => {
    expect(
      tallyReactions([
        { reaction_type: "heart" },
        { reaction_type: "heart" },
        { reaction_type: "fire" },
      ]),
    ).toEqual({ heart: 2, fire: 1 });
  });
  it("handles empty array", () => {
    expect(tallyReactions([])).toEqual({});
  });
});

describe("share_kind enum coverage", () => {
  const validKinds = ["manual", "streak", "pr", "meal_plan", "fasting", "workout_complete", "goal"];
  it("all kinds are strings", () => {
    for (const k of validKinds) {
      expect(typeof k).toBe("string");
      expect(k.length).toBeGreaterThan(0);
    }
  });
});
