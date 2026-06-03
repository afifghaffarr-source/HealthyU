export type ReminderCategory =
  | "water"
  | "meal"
  | "workout"
  | "sleep"
  | "medication"
  | "fasting"
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