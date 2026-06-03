import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/profile.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/prayer")({
  component: PrayerPage,
});

type Times = { Fajr: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string; Sunrise: string };

function PrayerPage() {
  const fetchProfile = useServerFn(getProfile);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const city = profile?.city ?? "Jakarta";

  const { data: times, isLoading } = useQuery({
    queryKey: ["prayer", city],
    queryFn: async () => {
      const today = new Date();
      const d = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
      const res = await fetch(`https://api.aladhan.com/v1/timingsByCity/${d}?city=${encodeURIComponent(city)}&country=Indonesia&method=20`);
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

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/dashboard" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-bold">Jadwal Sholat</h1>
        </header>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" />
          <span>{city}, Indonesia</span>
        </div>

        {isLoading && <p className="text-center text-muted-foreground py-8">Memuat...</p>}

        {times && (
          <>
            {nextIdx !== -1 && (
              <section className="bg-gradient-to-br from-sage to-sage-deep p-6 rounded-3xl text-primary-foreground animate-fade-up">
                <p className="text-xs uppercase tracking-widest opacity-80 font-bold mb-1">Sholat berikutnya</p>
                <p className="text-3xl font-bold">{prayers[nextIdx].name}</p>
                <p className="text-2xl tabular-nums mt-1">{prayers[nextIdx].time}</p>
              </section>
            )}

            <section className="bg-card rounded-3xl outline-1 outline-black/5 divide-y divide-border overflow-hidden animate-fade-up">
              {prayers.map((p, i) => (
                <div key={p.name} className={`flex justify-between items-center px-5 py-4 ${i === nextIdx ? "bg-secondary/50" : ""}`}>
                  <span className={`font-semibold ${i === nextIdx ? "text-primary" : ""}`}>{p.name}</span>
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