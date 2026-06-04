import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getPrayerTimes } from "@/lib/prayerTimes.functions";

export const Route = createFileRoute("/_authenticated/prayer/aladhan")({
  component: AladhanPage,
});

function AladhanPage() {
  const fetchTimes = useServerFn(getPrayerTimes);
  const [timings, setTimings] = useState<Record<string, string> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setErr("Geolocation tidak didukung");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetchTimes({ data: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
          if (r.ok) setTimings(r.timings);
          else setErr(r.error);
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Gagal memuat");
        } finally {
          setLoading(false);
        }
      },
      (e) => { setErr(e.message); setLoading(false); },
    );
  }, [fetchTimes]);

  return (
    <div className="min-h-screen pb-28 px-4">
      <TopAppBar title="Jadwal Sholat (Aladhan)" showBack />
      <div className="mt-4 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Memuat...</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}
        {timings && Object.entries(timings).map(([k, v]) => (
          <div key={k} className="flex justify-between rounded-2xl bg-card p-4 border border-border/40">
            <span className="font-semibold">{k}</span>
            <span className="font-mono text-primary">{v}</span>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}