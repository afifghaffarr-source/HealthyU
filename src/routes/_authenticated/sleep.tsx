import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { logSleep, recentSleep, deleteSleep } from "@/lib/sleep.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Moon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, defs } from "recharts";

export const Route = createFileRoute("/_authenticated/sleep")({
  component: SleepPage,
});

function toLocalIso(value: string) {
  // value is local datetime "yyyy-MM-ddTHH:mm"; convert to ISO
  return new Date(value).toISOString();
}

function defaultStart() {
  const d = new Date();
  d.setHours(22, 0, 0, 0);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 16);
}
function defaultEnd() {
  const d = new Date();
  d.setHours(6, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function SleepPage() {
  const qc = useQueryClient();
  const list = useServerFn(recentSleep);
  const log = useServerFn(logSleep);
  const del = useServerFn(deleteSleep);

  const { data: logs = [] } = useQuery({ queryKey: ["sleep"], queryFn: () => list() });

  const [start, setStart] = useState(defaultStart());
  const [end, setEnd] = useState(defaultEnd());
  const [quality, setQuality] = useState(3);

  const logMut = useMutation({
    mutationFn: () =>
      log({
        data: {
          sleep_start: toLocalIso(start),
          sleep_end: toLocalIso(end),
          quality,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sleep"] });
      toast.success("Tidur dicatat");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sleep"] }),
  });

  const last7 = logs.filter(
    (l) => Date.now() - new Date(l.sleep_end).getTime() < 7 * 86400000,
  );
  const totalHours = last7.reduce(
    (s, l) => s + (new Date(l.sleep_end).getTime() - new Date(l.sleep_start).getTime()) / 3600000,
    0,
  );
  const avgHours = last7.length ? totalHours / last7.length : 0;
  const avgQuality = last7.length ? last7.reduce((s, l) => s + l.quality, 0) / last7.length : 0;

  const chartData = [...last7]
    .sort((a, b) => new Date(a.sleep_end).getTime() - new Date(b.sleep_end).getTime())
    .map((l) => ({
      day: new Date(l.sleep_end).toLocaleDateString("id-ID", { weekday: "short" }),
      hours: Number(((new Date(l.sleep_end).getTime() - new Date(l.sleep_start).getTime()) / 3600000).toFixed(1)),
      score: l.quality * 20,
    }));

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Tidur" showBack />

        <section className="grid grid-cols-2 gap-3 animate-fade-up">
          <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Rata-rata 7 hari</p>
            <p className="text-2xl font-bold tabular-nums">{avgHours.toFixed(1)}<span className="text-sm">j</span></p>
          </div>
          <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Kualitas</p>
            <p className="text-2xl font-bold tabular-nums">{avgQuality.toFixed(1)}<span className="text-sm">/5</span></p>
          </div>
        </section>

        {chartData.length > 0 && (
          <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Tren 7 hari</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sleepG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, fontSize: 12, border: "none", boxShadow: "0 4px 14px rgba(0,0,0,0.1)" }}
                    formatter={(v: number, n: string) => (n === "hours" ? [`${v}j`, "Durasi"] : [v, "Skor"])}
                  />
                  <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} fill="url(#sleepG)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 space-y-3 animate-fade-up">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Catat tidur</p>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Mulai tidur</span>
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full bg-background outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm mt-1"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">Bangun</span>
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full bg-background outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm mt-1"
            />
          </label>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Kualitas</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuality(n)}
                  className={`flex-1 py-2 rounded-xl text-lg ${
                    quality >= n ? "bg-accent text-accent-foreground" : "bg-mint"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => logMut.mutate()}
            disabled={logMut.isPending}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl"
          >
            Simpan
          </button>
        </section>

        <section className="space-y-2 animate-fade-up">
          <h2 className="text-sm font-bold px-1">Riwayat</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada catatan</p>
          ) : (
            logs.map((l) => {
              const hrs = (new Date(l.sleep_end).getTime() - new Date(l.sleep_start).getTime()) / 3600000;
              return (
                <div key={l.id} className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3">
                  <div className="size-12 rounded-xl bg-indigo-100 grid place-items-center">
                    <Moon className="size-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{hrs.toFixed(1)} jam · {"★".repeat(l.quality)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(l.sleep_start).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button onClick={() => delMut.mutate(l.id)} className="p-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}