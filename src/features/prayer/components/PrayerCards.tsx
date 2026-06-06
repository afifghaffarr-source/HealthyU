import { Bell, BellOff } from "lucide-react";
import type { PrayerPrefs } from "@/lib/reminders-store";
import { shiftMinutes } from "../lib/prayer-time";

export function PrayerSettingsCard({
  prefs,
  permission,
  onToggleEnable,
  onTogglePref,
}: {
  prefs: PrayerPrefs;
  permission: NotificationPermission;
  onToggleEnable: () => void;
  onTogglePref: (key: keyof PrayerPrefs) => void;
}) {
  const active = prefs.enabled && permission === "granted";
  return (
    <section className="bg-card p-4 rounded-2xl outline-1 outline-black/5 space-y-3 animate-fade-up">
      <button
        onClick={onToggleEnable}
        className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm ${
          active ? "bg-mint text-sage-deep" : "bg-primary text-primary-foreground"
        }`}
      >
        {active ? (
          <>
            <Bell className="size-4" /> Notifikasi sholat aktif
          </>
        ) : (
          <>
            <BellOff className="size-4" /> Aktifkan notifikasi sholat
          </>
        )}
      </button>
      {active && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          {(
            [
              ["sahur", "Sahur (-20m)"],
              ["fajr", "Subuh"],
              ["dhuhr", "Dzuhur"],
              ["asr", "Ashar"],
              ["maghrib", "Maghrib"],
              ["iftar", "Berbuka"],
              ["isha", "Isya"],
            ] as Array<[keyof PrayerPrefs, string]>
          ).map(([k, label]) => (
            <label
              key={k}
              className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2 text-xs cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!!prefs[k]}
                onChange={() => onTogglePref(k)}
                className="accent-primary"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground text-center">
        Notifikasi berjalan saat app/tab terbuka.
      </p>
    </section>
  );
}

export function NextPrayerCard({
  name,
  time,
  countdown,
}: {
  name: string;
  time: string;
  countdown: string | null;
}) {
  return (
    <section className="bg-gradient-to-br from-sage to-sage-deep p-6 rounded-3xl text-primary-foreground animate-fade-up">
      <p className="text-xs uppercase tracking-widest opacity-80 font-bold mb-1">
        Sholat berikutnya
      </p>
      <p className="text-3xl font-bold">{name}</p>
      <p className="text-2xl tabular-nums mt-1">{time}</p>
      {countdown && <p className="text-sm mt-2 opacity-90">⏳ {countdown} lagi</p>}
    </section>
  );
}

export function ImsakSunriseGrid({ fajr, sunrise }: { fajr: string; sunrise: string }) {
  return (
    <section className="grid grid-cols-2 gap-3 animate-fade-up">
      <div className="bg-card p-4 rounded-2xl outline-1 outline-black/5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Imsak
        </p>
        <p className="text-lg font-bold tabular-nums">{shiftMinutes(fajr, -10)}</p>
      </div>
      <div className="bg-card p-4 rounded-2xl outline-1 outline-black/5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Terbit
        </p>
        <p className="text-lg font-bold tabular-nums">{sunrise}</p>
      </div>
    </section>
  );
}

export function PrayerTimesList({
  prayers,
  nextIdx,
}: {
  prayers: Array<{ name: string; time: string }>;
  nextIdx: number;
}) {
  return (
    <section className="bg-card rounded-3xl outline-1 outline-black/5 divide-y divide-border overflow-hidden animate-fade-up">
      {prayers.map((p, i) => (
        <div
          key={p.name}
          className={`flex justify-between items-center px-5 py-4 ${i === nextIdx ? "bg-secondary/50" : ""}`}
        >
          <span className={`font-semibold ${i === nextIdx ? "text-primary" : ""}`}>{p.name}</span>
          <span className="tabular-nums font-bold">{p.time}</span>
        </div>
      ))}
    </section>
  );
}
