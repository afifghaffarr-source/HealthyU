import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { qiblaBearing } from "@/lib/qibla";

export const Route = createFileRoute("/_authenticated/prayer/qibla")({
  component: QiblaPage,
});

function QiblaPage() {
  const [heading, setHeading] = useState(0);
  const [bearing, setBearing] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setErr("Geolocation tidak didukung");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setBearing(qiblaBearing(pos.coords.latitude, pos.coords.longitude)),
      (e) => setErr(e.message),
    );
    const handler = (e: DeviceOrientationEvent) => {
      if (typeof e.alpha === "number") setHeading(360 - e.alpha);
    };
    window.addEventListener("deviceorientation", handler, true);
    return () => window.removeEventListener("deviceorientation", handler, true);
  }, []);

  const rotation = bearing !== null ? bearing - heading : 0;

  return (
    <div className="min-h-dvh pb-28 px-4">
      <TopAppBar title="Arah Kiblat" showBack />
      <div className="mt-10 flex flex-col items-center gap-6">
        <div className="relative size-64 rounded-full border-4 border-primary/30 flex items-center justify-center">
          <div
            className="text-7xl transition-transform duration-200"
            style={{ transform: `rotate(${rotation}deg)` }}
            aria-label="Penunjuk kiblat"
          >
            🕋
          </div>
        </div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        {bearing !== null && (
          <p className="text-sm text-muted-foreground">
            Bearing: <span className="font-semibold text-foreground">{bearing.toFixed(1)}°</span>
          </p>
        )}
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Aktifkan izin lokasi & sensor orientasi. Sesuaikan dengan menghadap ka'bah.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
