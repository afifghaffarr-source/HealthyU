import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/features/profile/lib/profile.functions";
import { BottomNav } from "@/components/bottom-nav";
import { MapPin, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import {
  loadPrayerPrefs,
  savePrayerContext,
  savePrayerPrefs,
  syncPrayerReminders,
  type PrayerPrefs,
} from "@/lib/reminders-store";

export const Route = createFileRoute("/_authenticated/prayer")({
  component: PrayerPage,
});

type Times = {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Sunrise: string;
};

function PrayerPage() {
  const fetchProfile = useServerFn(getProfile);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const city = profile?.city ?? "Jakarta";

  const { data: times, isLoading } = useQuery({
    queryKey: ["prayer", city],
    queryFn: async () => {
      const today = new Date();
      const d = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
      const res = await fetch(
        `https://api.aladhan.com/v1/timingsByCity/${d}?city=${encodeURIComponent(city)}&country=Indonesia&method=20`,
      );
      const json = await res.json();
      return json?.data?.timings as Times;
    },
    enabled: !!city,
  });

  const prayers = times
    ? [
        { name: "Subuh", time: times.Fajr },
        { name: "Dzuhur", time: times.Dhuhr },
        { name: "Ashar", time: times.Asr },
        { name: "Maghrib", time: times.Maghrib },
        { name: "Isya", time: times.Isha },
      ]
    : [];

  const nextIdx = findNext(prayers);
  const countdown = useCountdown(nextIdx !== -1 ? prayers[nextIdx]?.time : undefined);

  const [prefs, setPrefs] = useState<PrayerPrefs>(() => loadPrayerPrefs());
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Re-sync stored reminders whenever times or prefs change.
  useEffect(() => {
    if (!times) return;
    syncPrayerReminders(times, prefs);
    savePrayerContext({
      city,
      dateKey: new Date().toISOString().slice(0, 10),
      times: {
        Fajr: times.Fajr,
        Dhuhr: times.Dhuhr,
        Asr: times.Asr,
        Maghrib: times.Maghrib,
        Isha: times.Isha,
      },
    });
  }, [city, times, prefs]);

  const requestPermAndEnable = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser tidak mendukung notifikasi");
      return;
    }
    let p = Notification.permission;
    if (p === "default") p = await Notification.requestPermission();
    setPermission(p);
    if (p !== "granted") {
      toast.error("Izin notifikasi ditolak");
      return;
    }
    const next = { ...prefs, enabled: !prefs.enabled };
    setPrefs(next);
    savePrayerPrefs(next);
    toast.success(next.enabled ? "Notifikasi sholat aktif" : "Notifikasi sholat dimatikan");
  };

  const togglePref = (key: keyof PrayerPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    savePrayerPrefs(next);
  };

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Jadwal Sholat" showBack />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          <span>{city}, Indonesia</span>
        </div>

        {isLoading && <p className="text-center text-muted-foreground py-8">Memuat...</p>}

        {times && (
          <>
            <section className="bg-card p-4 rounded-2xl outline-1 outline-black/5 space-y-3 animate-fade-up">
              <button
                onClick={requestPermAndEnable}
                className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm ${
                  prefs.enabled && permission === "granted"
                    ? "bg-mint text-sage-deep"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {prefs.enabled && permission === "granted" ? (
                  <>
                    <Bell className="size-4" /> Notifikasi sholat aktif
                  </>
                ) : (
                  <>
                    <BellOff className="size-4" /> Aktifkan notifikasi sholat
                  </>
                )}
              </button>
              {prefs.enabled && permission === "granted" && (
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
                        onChange={() => togglePref(k)}
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

            {nextIdx !== -1 && (
              <section className="bg-gradient-to-br from-sage to-sage-deep p-6 rounded-3xl text-primary-foreground animate-fade-up">
                <p className="text-xs uppercase tracking-widest opacity-80 font-bold mb-1">
                  Sholat berikutnya
                </p>
                <p className="text-3xl font-bold">{prayers[nextIdx].name}</p>
                <p className="text-2xl tabular-nums mt-1">{prayers[nextIdx].time}</p>
                {countdown && <p className="text-sm mt-2 opacity-90">⏳ {countdown} lagi</p>}
              </section>
            )}

            {times && (
              <section className="grid grid-cols-2 gap-3 animate-fade-up">
                <div className="bg-card p-4 rounded-2xl outline-1 outline-black/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Imsak
                  </p>
                  <p className="text-lg font-bold tabular-nums">{shiftMinutes(times.Fajr, -10)}</p>
                </div>
                <div className="bg-card p-4 rounded-2xl outline-1 outline-black/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Terbit
                  </p>
                  <p className="text-lg font-bold tabular-nums">{times.Sunrise}</p>
                </div>
              </section>
            )}

            <section className="bg-card rounded-3xl outline-1 outline-black/5 divide-y divide-border overflow-hidden animate-fade-up">
              {prayers.map((p, i) => (
                <div
                  key={p.name}
                  className={`flex justify-between items-center px-5 py-4 ${i === nextIdx ? "bg-secondary/50" : ""}`}
                >
                  <span className={`font-semibold ${i === nextIdx ? "text-primary" : ""}`}>
                    {p.name}
                  </span>
                  <span className="tabular-nums font-bold">{p.time}</span>
                </div>
              ))}
            </section>

            <p className="text-xs text-muted-foreground text-center">
              Sumber: Aladhan API · Metode Kemenag RI
            </p>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function findNext(prayers: Array<{ name: string; time: string }>): number {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < prayers.length; i++) {
    const [h, m] = prayers[i].time.split(":").map(Number);
    if (h * 60 + m > cur) return i;
  }
  return 0; // tomorrow's Fajr
}

function shiftMinutes(time: string, delta: number): string {
  const [h, m] = time.split(":").map(Number);
  let total = h * 60 + m + delta;
  total = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function useCountdown(time?: string): string | null {
  const [, force] = useState(0);
  useEffect(() => {
    if (!time) return;
    const id = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [time]);
  if (!time) return null;
  const now = new Date();
  const [h, m] = time.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const hh = Math.floor(diff / 3_600_000);
  const mm = Math.floor((diff % 3_600_000) / 60_000);
  const ss = Math.floor((diff % 60_000) / 1000);
  return `${hh}j ${mm}m ${ss}d`;
}
