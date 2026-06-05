import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/features/profile/lib/profile.functions";
import { BottomNav } from "@/components/bottom-nav";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  loadPrayerPrefs,
  savePrayerContext,
  savePrayerPrefs,
  syncPrayerReminders,
  type PrayerPrefs,
} from "@/lib/reminders-store";
import { findNext, useCountdown } from "@/features/prayer/lib/prayer-time";
import {
  ImsakSunriseGrid,
  NextPrayerCard,
  PrayerSettingsCard,
  PrayerTimesList,
} from "@/features/prayer/components/PrayerCards";

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
            <PrayerSettingsCard
              prefs={prefs}
              permission={permission}
              onToggleEnable={requestPermAndEnable}
              onTogglePref={togglePref}
            />

            {nextIdx !== -1 && (
              <NextPrayerCard
                name={prayers[nextIdx].name}
                time={prayers[nextIdx].time}
                countdown={countdown}
              />
            )}

            <ImsakSunriseGrid fajr={times.Fajr} sunrise={times.Sunrise} />

            <PrayerTimesList prayers={prayers} nextIdx={nextIdx} />

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