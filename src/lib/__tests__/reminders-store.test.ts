import { describe, it, expect, beforeEach } from "vitest";
import {
  loadReminders,
  saveReminders,
  STORAGE_KEY,
  loadPrayerPrefs,
  savePrayerPrefs,
  PRAYER_PREFS_KEY,
  loadPrayerContext,
  savePrayerContext,
  syncPrayerReminders,
  DEFAULT_REMINDERS,
  DEFAULT_PRAYER_PREFS,
  type PrayerTimings,
} from "../reminders-store";

beforeEach(() => {
  localStorage.clear();
});

describe("reminders CRUD", () => {
  it("loads defaults when storage empty", () => {
    expect(loadReminders()).toEqual(DEFAULT_REMINDERS);
  });
  it("returns defaults on invalid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not-json");
    expect(loadReminders()).toEqual(DEFAULT_REMINDERS);
  });
  it("returns defaults when parsed is not array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 1 }));
    expect(loadReminders()).toEqual(DEFAULT_REMINDERS);
  });
  it("round-trips via save/load", () => {
    const items = [
      {
        id: "x",
        label: "X",
        time: "08:00",
        enabled: true,
        category: "custom" as const,
        days: [],
      },
    ];
    saveReminders(items);
    expect(loadReminders()).toEqual(items);
  });
});

describe("prayer prefs", () => {
  it("merges defaults with stored partial", () => {
    localStorage.setItem(PRAYER_PREFS_KEY, JSON.stringify({ enabled: true, fajr: false }));
    const p = loadPrayerPrefs();
    expect(p.enabled).toBe(true);
    expect(p.fajr).toBe(false);
    expect(p.isha).toBe(DEFAULT_PRAYER_PREFS.isha);
  });
  it("falls back on invalid JSON", () => {
    localStorage.setItem(PRAYER_PREFS_KEY, "broken");
    expect(loadPrayerPrefs()).toEqual(DEFAULT_PRAYER_PREFS);
  });
  it("round-trips", () => {
    savePrayerPrefs({ ...DEFAULT_PRAYER_PREFS, enabled: true });
    expect(loadPrayerPrefs().enabled).toBe(true);
  });
});

describe("prayer context", () => {
  it("returns null when missing", () => {
    expect(loadPrayerContext()).toBeNull();
  });
  it("returns null when partial", () => {
    savePrayerContext({ city: "JKT" } as never);
    expect(loadPrayerContext()).toBeNull();
  });
  it("round-trips when complete", () => {
    const ctx = {
      city: "JKT",
      dateKey: "2025-01-01",
      times: {
        Fajr: "04:30",
        Dhuhr: "12:00",
        Asr: "15:30",
        Maghrib: "18:00",
        Isha: "19:15",
      },
    };
    savePrayerContext(ctx);
    expect(loadPrayerContext()).toEqual(ctx);
  });
});

describe("syncPrayerReminders", () => {
  const times: PrayerTimings = {
    Fajr: "04:30",
    Dhuhr: "12:00",
    Asr: "15:30",
    Maghrib: "18:00",
    Isha: "19:15",
  };

  it("removes prayer-* entries when disabled", () => {
    saveReminders([
      {
        id: "prayer-fajr",
        label: "X",
        time: "04:30",
        enabled: true,
        category: "prayer",
        days: [],
      },
      { id: "water", label: "W", time: "07:00", enabled: true, category: "water", days: [] },
    ]);
    syncPrayerReminders(times, { ...DEFAULT_PRAYER_PREFS, enabled: false });
    const after = loadReminders();
    expect(after.find((r) => r.id.startsWith("prayer-"))).toBeUndefined();
    expect(after.find((r) => r.id === "water")).toBeDefined();
  });

  it("adds sahur 20min before Fajr and prayer entries when enabled", () => {
    saveReminders([]);
    syncPrayerReminders(times, { ...DEFAULT_PRAYER_PREFS, enabled: true });
    const after = loadReminders();
    const sahur = after.find((r) => r.id === "prayer-sahur");
    expect(sahur?.time).toBe("04:10");
    expect(after.find((r) => r.id === "prayer-fajr")?.time).toBe("04:30");
    expect(after.find((r) => r.id === "prayer-maghrib")?.time).toBe("18:00");
  });

  it("respects per-prayer toggles", () => {
    saveReminders([]);
    syncPrayerReminders(times, {
      ...DEFAULT_PRAYER_PREFS,
      enabled: true,
      asr: false,
      isha: false,
    });
    const after = loadReminders();
    expect(after.find((r) => r.id === "prayer-asr")).toBeUndefined();
    expect(after.find((r) => r.id === "prayer-isha")).toBeUndefined();
    expect(after.find((r) => r.id === "prayer-fajr")).toBeDefined();
  });
});