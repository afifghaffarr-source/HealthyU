import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getPrayerTimes } from "@/features/prayer/lib/prayerTimes.functions";
import { Sunrise, Sun, Sunset, Moon, CloudMoon, MapPin } from "lucide-react";

const ICONS: Record<string, typeof Sunrise> = {
  Fajr: Sunrise,
  Sunrise: Sunrise,
  Dhuhr: Sun,
  Asr: Sun,
  Maghrib: Sunset,
  Isha: Moon,
  Imsak: CloudMoon,
  Midnight: Moon,
};
const SHOW = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const LABELS: Record<string, string> = {
  Fajr: "Subuh",
  Sunrise: "Terbit",
  Dhuhr: "Dzuhur",
  Asr: "Ashar",
  Maghrib: "Maghrib",
  Isha: "Isya",
};

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
function fmtRemaining(min: number) {
  if (min < 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} jam ${m} mnt` : `${m} mnt`;
}

export const Route = createFileRoute("/_authenticated/prayer/aladhan")({
  component: AladhanPage,
});

function AladhanPage() {
  const fetchTimes = useServerFn(getPrayerTimes);
  const [timings, setTimings] = useState<Record<string, string> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store/async-query sync; `useSyncExternalStore` and equivalent restructure would change the API surface
      setErr("Geolocation tidak didukung");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetchTimes({
            data: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          if (r.ok) setTimings(r.timings);
          else setErr(r.error);
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Gagal memuat");
        } finally {
          setLoading(false);
        }
      },
      (e) => {
        setErr(e.message);
        setLoading(false);
      },
    );
  }, [fetchTimes]);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const filtered = timings
    ? SHOW.map((k) => [k, timings[k]?.slice(0, 5)] as const).filter(([, v]) => !!v)
    : [];
  const upcoming = filtered.find(([, v]) => toMinutes(v) > nowMin);
  const next = upcoming ?? filtered[0];

  return (
    <div className="min-h-dvh pb-28 px-4 bg-background">
      <TopAppBar title="Jadwal Sholat (Aladhan)" showBack />
      <div className="mt-4 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Memuat lokasi & jadwal...</p>}
        {err && (
          <div className="rounded-2xl bg-destructive/10 text-destructive p-4 text-sm flex items-start gap-2">
            <MapPin className="size-4 mt-0.5" /> {err}
          </div>
        )}
        {next && (
          <div className="rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground p-5 shadow-lg">
            <p className="text-xs uppercase tracking-wider opacity-80">Sholat berikutnya</p>
            <div className="flex items-end justify-between mt-1">
              <div>
                <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                  {LABELS[next[0]] ?? next[0]}
                </p>
                <p className="text-sm opacity-90">
                  {fmtRemaining(toMinutes(next[1]) - nowMin)} lagi
                </p>
              </div>
              <p className="text-2xl font-mono tabular-nums">{next[1]}</p>
            </div>
          </div>
        )}
        {filtered.map(([k, v]) => {
          const Icon = ICONS[k] ?? Sun;
          const isNext = next?.[0] === k;
          const passed = toMinutes(v) <= nowMin;
          return (
            <div
              key={k}
              className={`flex items-center justify-between rounded-2xl p-4 border transition ${
                isNext
                  ? "bg-primary/10 border-primary/40"
                  : passed
                    ? "bg-card border-border/40 opacity-60"
                    : "bg-card border-border/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`size-9 grid place-items-center rounded-xl ${isNext ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  <Icon className="size-4" />
                </span>
                <span className="font-semibold">{LABELS[k] ?? k}</span>
              </div>
              <span className="font-mono tabular-nums text-primary">{v}</span>
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
