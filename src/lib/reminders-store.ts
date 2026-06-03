export type ReminderCategory =
  | "water"
  | "meal"
  | "workout"
  | "sleep"
  | "medication"
  | "fasting"
  | "prayer"
  | "custom";

export type Reminder = {
  id: string;
  label: string;
  time: string; // HH:mm
  enabled: boolean;
  category: ReminderCategory;
  /** 0=Sun .. 6=Sat. Empty array = every day */
  days: number[];
};

export const STORAGE_KEY = "reminders-v2";
export const FIRED_KEY = "reminders-fired-v2";

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: "water-morning", label: "Minum air pagi", time: "07:00", enabled: true, category: "water", days: [] },
  { id: "breakfast", label: "Sarapan sehat", time: "07:30", enabled: true, category: "meal", days: [] },
  { id: "water-noon", label: "Minum air siang", time: "12:00", enabled: true, category: "water", days: [] },
  { id: "lunch", label: "Makan siang", time: "12:30", enabled: true, category: "meal", days: [] },
  { id: "workout", label: "Waktunya olahraga", time: "17:00", enabled: false, category: "workout", days: [1, 3, 5] },
  { id: "water-evening", label: "Minum air sore", time: "17:30", enabled: true, category: "water", days: [] },
  { id: "dinner", label: "Makan malam", time: "19:00", enabled: true, category: "meal", days: [] },
  { id: "meds", label: "Cek obat & vitamin", time: "20:00", enabled: false, category: "medication", days: [] },
  { id: "fasting-start", label: "Mulai puasa 16:8", time: "20:00", enabled: false, category: "fasting", days: [] },
  { id: "sleep", label: "Waktunya tidur", time: "22:00", enabled: false, category: "sleep", days: [] },
];

export function loadReminders(): Reminder[] {
  if (typeof window === "undefined") return DEFAULT_REMINDERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDERS;
    const parsed = JSON.parse(raw) as Reminder[];
    if (!Array.isArray(parsed)) return DEFAULT_REMINDERS;
    return parsed;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

export function saveReminders(items: Reminder[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export const PRAYER_PREFS_KEY = "prayer-notif-prefs-v1";
export const PRAYER_CONTEXT_KEY = "prayer-notif-context-v1";

export type PrayerPrefs = {
  enabled: boolean;
  sahur: boolean;
  iftar: boolean;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
};

export const DEFAULT_PRAYER_PREFS: PrayerPrefs = {
  enabled: false,
  sahur: true,
  iftar: true,
  fajr: true,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
};

export function loadPrayerPrefs(): PrayerPrefs {
  if (typeof window === "undefined") return DEFAULT_PRAYER_PREFS;
  try {
    const raw = localStorage.getItem(PRAYER_PREFS_KEY);
    if (!raw) return DEFAULT_PRAYER_PREFS;
    return { ...DEFAULT_PRAYER_PREFS, ...(JSON.parse(raw) as Partial<PrayerPrefs>) };
  } catch {
    return DEFAULT_PRAYER_PREFS;
  }
}

export function savePrayerPrefs(p: PrayerPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRAYER_PREFS_KEY, JSON.stringify(p));
}

function shift(time: string, deltaMin: number): string {
  const [h, m] = time.split(":").map(Number);
  let total = h * 60 + m + deltaMin;
  total = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export type PrayerTimings = {
  Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string;
};

export type PrayerNotificationContext = {
  city: string;
  dateKey: string;
  times: PrayerTimings;
};

export function loadPrayerContext(): PrayerNotificationContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PRAYER_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PrayerNotificationContext>;
    if (!parsed?.city || !parsed?.dateKey || !parsed?.times) return null;
    return parsed as PrayerNotificationContext;
  } catch {
    return null;
  }
}

export function savePrayerContext(context: PrayerNotificationContext) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRAYER_CONTEXT_KEY, JSON.stringify(context));
}

/** Replace all reminders with id prefix "prayer-" using current times + prefs. */
export function syncPrayerReminders(times: PrayerTimings, prefs: PrayerPrefs) {
  const others = loadReminders().filter((r) => !r.id.startsWith("prayer-"));
  if (!prefs.enabled) {
    saveReminders(others);
    return;
  }
  const next: Reminder[] = [...others];
  const add = (id: string, label: string, time: string, enabled: boolean) => {
    if (!enabled) return;
    next.push({ id, label, time: time.slice(0, 5), enabled: true, category: "prayer", days: [] });
  };
  add("prayer-sahur", "Waktu sahur (20 menit sebelum Subuh)", shift(times.Fajr, -20), prefs.sahur);
  add("prayer-fajr", "Adzan Subuh", times.Fajr, prefs.fajr);
  add("prayer-dhuhr", "Adzan Dzuhur", times.Dhuhr, prefs.dhuhr);
  add("prayer-asr", "Adzan Ashar", times.Asr, prefs.asr);
  add("prayer-maghrib", "Adzan Maghrib", times.Maghrib, prefs.maghrib);
  add("prayer-iftar", "Waktu berbuka puasa", times.Maghrib, prefs.iftar);
  add("prayer-isha", "Adzan Isya", times.Isha, prefs.isha);
  saveReminders(next);
}

export async function refreshPrayerRemindersForToday() {
  if (typeof window === "undefined") return;

  const prefs = loadPrayerPrefs();
  const context = loadPrayerContext();
  if (!prefs.enabled || !context?.city) return;

  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10);
  if (context.dateKey === dateKey) return;

  const apiDate = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timingsByCity/${apiDate}?city=${encodeURIComponent(context.city)}&country=Indonesia&method=20`,
    );
    const json = await res.json();
    const nextTimes = json?.data?.timings as PrayerTimings | undefined;
    if (!nextTimes?.Fajr || !nextTimes?.Maghrib) return;
    syncPrayerReminders(nextTimes, prefs);
    savePrayerContext({ city: context.city, dateKey, times: nextTimes });
  } catch {
    return;
  }
}