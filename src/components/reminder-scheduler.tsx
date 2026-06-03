import { useEffect } from "react";
import { FIRED_KEY, loadReminders, refreshPrayerRemindersForToday, type Reminder } from "@/lib/reminders-store";

function shouldFire(r: Reminder, now: Date, fired: Record<string, string>, todayKey: string) {
  if (!r.enabled) return false;
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (r.time !== hhmm) return false;
  if (r.days.length > 0 && !r.days.includes(now.getDay())) return false;
  if (fired[r.id] === todayKey) return false;
  return true;
}

export function ReminderScheduler() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    const tick = () => {
      if (Notification.permission !== "granted") return;
      void refreshPrayerRemindersForToday();
      const items = loadReminders();
      const now = new Date();
      const todayKey = now.toISOString().slice(0, 10);
      let fired: Record<string, string> = {};
      try {
        fired = JSON.parse(localStorage.getItem(FIRED_KEY) || "{}");
      } catch {/* ignore */}
      let changed = false;
      for (const r of items) {
        if (shouldFire(r, now, fired, todayKey)) {
          try {
            new Notification("HealthyU", { body: r.label, icon: "/icon-192.svg" });
          } catch {/* ignore */}
          fired[r.id] = todayKey;
          changed = true;
        }
      }
      if (changed) localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
    };

    tick();
    const id = window.setInterval(tick, 30000);
    return () => window.clearInterval(id);
  }, []);

  return null;
}