import { describe, expect, it } from "vitest";
import { adaptiveGreeting } from "@/features/dashboard/lib/adaptiveGreeting";

describe("adaptiveGreeting", () => {
  describe("time-of-day defaults", () => {
    it("returns morning greeting for hour 8", () => {
      const g = adaptiveGreeting({ hour: 8 });
      expect(g.eyebrow).toBe("Selamat Pagi");
      expect(g.mood).toBe("warm");
    });

    it("returns midday greeting for hour 12", () => {
      const g = adaptiveGreeting({ hour: 12 });
      expect(g.eyebrow).toBe("Selamat Siang");
    });

    it("returns afternoon greeting for hour 16", () => {
      const g = adaptiveGreeting({ hour: 16 });
      expect(g.eyebrow).toBe("Selamat Sore");
    });

    it("returns evening greeting for hour 20", () => {
      const g = adaptiveGreeting({ hour: 20 });
      expect(g.eyebrow).toBe("Selamat Malam");
    });
  });

  describe("streak milestones", () => {
    it("celebrates 7-day streak", () => {
      const g = adaptiveGreeting({ streak: 7 });
      expect(g.mood).toBe("warm");
      expect(g.primary).toContain("Satu minggu");
    });

    it("celebrates 30-day streak", () => {
      const g = adaptiveGreeting({ streak: 30 });
      expect(g.mood).toBe("fire");
      expect(g.primary).toContain("Bulan penuh");
    });

    it("celebrates 100-day streak", () => {
      const g = adaptiveGreeting({ streak: 100 });
      expect(g.mood).toBe("fire");
      expect(g.eyebrow).toContain("100");
    });

    it("celebrates 365+ day streak as luar biasa", () => {
      const g = adaptiveGreeting({ streak: 400 });
      expect(g.mood).toBe("celebrate");
      expect(g.eyebrow).toBe("Pencapaian Luar Biasa");
    });

    it("uses warm tone for 14-day streak", () => {
      const g = adaptiveGreeting({ streak: 14 });
      expect(g.mood).toBe("warm");
    });
  });

  describe("active fast state", () => {
    it("uses warm tone for active fast in morning", () => {
      const g = adaptiveGreeting({ hour: 8, hasActiveFast: true });
      expect(g.mood).toBe("warm");
      expect(g.eyebrow).toBe("Puasa Berjalan");
    });

    it("uses moon tone for active fast near iftar", () => {
      const g = adaptiveGreeting({ hour: 17, hasActiveFast: true });
      expect(g.mood).toBe("moon");
    });
  });

  describe("no meals yet today", () => {
    it("nudges user to breakfast in morning", () => {
      const g = adaptiveGreeting({ hour: 8, mealsToday: 0 });
      expect(g.eyebrow).toBe("Selamat Pagi");
      expect(g.primary).toContain("sarapan");
    });

    it("nudges user to log a meal in afternoon", () => {
      const g = adaptiveGreeting({ hour: 14, mealsToday: 0 });
      expect(g.primary.toLowerCase()).toContain("belum ada catatan");
    });

    it("nudges user to not skip dinner at night", () => {
      const g = adaptiveGreeting({ hour: 20, mealsToday: 0 });
      expect(g.primary.toLowerCase()).toContain("makan malam");
    });
  });

  describe("priority order", () => {
    it("streak milestone overrides time-of-day", () => {
      const g = adaptiveGreeting({ hour: 8, streak: 30 });
      expect(g.eyebrow).toContain("Streak");
    });

    it("streak milestone overrides active fast", () => {
      const g = adaptiveGreeting({ hour: 14, streak: 7, hasActiveFast: true });
      expect(g.eyebrow).toContain("Streak");
    });

    it("active fast overrides no-meals nudge", () => {
      const g = adaptiveGreeting({ hour: 14, hasActiveFast: true, mealsToday: 0 });
      expect(g.eyebrow).toBe("Puasa Berjalan");
    });
  });

  describe("default fallback", () => {
    it("returns a valid greeting with no inputs", () => {
      const g = adaptiveGreeting({});
      expect(g.eyebrow).toBeTruthy();
      expect(g.primary).toBeTruthy();
      expect(g.secondary).toBeTruthy();
      expect(["neutral", "warm", "celebrate", "fire", "moon"]).toContain(g.mood);
    });
  });
});
