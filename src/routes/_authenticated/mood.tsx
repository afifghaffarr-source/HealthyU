import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMood, addMood, deleteMood } from "@/lib/mood.functions";
import { BottomNav } from "@/components/bottom-nav";
import { Trash2, Loader2, TrendingUp, Smile } from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { SyncPill } from "@/components/healthyu/sync-pill";
import { EmptyState } from "@/components/healthyu/empty-state";
import { toast } from "sonner";
import { enqueue } from "@/lib/offline-queue";
import { useOfflineQueue } from "@/hooks/use-offline-queue";

export const Route = createFileRoute("/_authenticated/mood")({
  component: MoodPage,
});

const MOODS = [
  { v: 1, e: "😢", label: "Buruk" },
  { v: 2, e: "😕", label: "Kurang" },
  { v: 3, e: "😐", label: "Biasa" },
  { v: 4, e: "🙂", label: "Baik" },
  { v: 5, e: "😄", label: "Hebat" },
] as const;

function MoodPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listMood);
  const add = useServerFn(addMood);
  const del = useServerFn(deleteMood);
  const { online, pending, sync } = useOfflineQueue();

  const { data: logs = [] } = useQuery({ queryKey: ["mood"], queryFn: () => fetchList() });

  const [mood, setMood] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const addMut = useMutation({
    mutationFn: async () => {
      const payload = { mood: mood!, note: note.trim() || undefined };
      if (!navigator.onLine) {
        await enqueue("mood", payload);
        return { offline: true as const };
      }
      return add({ data: payload });
    },
    onSuccess: (res) => {
      setMood(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["mood"] });
      toast.success(
        res && "offline" in res && res.offline
          ? "Mood disimpan offline. Akan sync otomatis."
          : "Mood tercatat",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mood"] });
      toast.success("Dihapus");
    },
  });

  const avg =
    logs.length === 0 ? null : logs.reduce((a, l) => a + (l.mood as number), 0) / logs.length;

  const last14 = useMemo(() => {
    const days: { d: string; label: string; v: number | null }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      const todays = logs.filter((l) => (l.logged_at as string).slice(0, 10) === key);
      const v = todays.length
        ? todays.reduce((a, l) => a + (l.mood as number), 0) / todays.length
        : null;
      days.push({ d: key, label: String(dt.getDate()), v });
    }
    return days;
  }, [logs]);
  const trendAvg = useMemo(() => {
    const valid = last14.filter((d) => d.v != null) as { v: number }[];
    return valid.length ? valid.reduce((a, x) => a + x.v, 0) / valid.length : null;
  }, [last14]);

  return (
    <div className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-4">
        <TopAppBar
          title="Mood & Jurnal"
          subtitle={avg ? `Rata-rata 30 hari: ${avg.toFixed(1)} / 5` : "Catat perasaanmu hari ini"}
          showBack
          action={<SyncPill online={online} pending={pending} onSync={() => sync()} />}
        />
      </div>

      <main className="max-w-md mx-auto px-4 space-y-6">
        {logs.length > 0 && (
          <section className="rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 p-4 outline-1 outline-black/5 animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="size-3" /> Tren 14 hari
              </div>
              {trendAvg != null && (
                <span className="text-xs font-semibold tabular-nums">
                  Avg {trendAvg.toFixed(1)} {MOODS.find((m) => Math.round(trendAvg) === m.v)?.e}
                </span>
              )}
            </div>
            <div className="flex items-end gap-1 h-20">
              {last14.map((d, i) => {
                const h = d.v == null ? 6 : 12 + (d.v / 5) * 56;
                const color =
                  d.v == null
                    ? "bg-muted"
                    : d.v >= 4
                      ? "bg-emerald-400"
                      : d.v >= 3
                        ? "bg-amber-300"
                        : "bg-rose-400";
                return (
                  <div
                    key={d.d}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${d.d}: ${d.v?.toFixed(1) ?? "—"}`}
                  >
                    <div
                      className={`w-full rounded-md ${color} transition-all`}
                      style={{ height: `${h}px` }}
                    />
                    {i % 2 === 0 && (
                      <span className="text-[9px] text-muted-foreground tabular-nums">
                        {d.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-card p-5 outline-1 outline-black/5">
          <p className="text-sm font-semibold mb-3">Bagaimana perasaanmu?</p>
          <div className="flex justify-between gap-2">
            {MOODS.map((m) => (
              <button
                key={m.v}
                onClick={() => setMood(m.v)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition ${
                  mood === m.v
                    ? "bg-primary/10 outline-2 outline-primary"
                    : "bg-muted/50 outline-1 outline-black/5"
                }`}
              >
                <span className="text-2xl">{m.e}</span>
                <span className="text-[10px] font-medium">{m.label}</span>
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan singkat (opsional)…"
            rows={3}
            maxLength={500}
            className="mt-4 w-full rounded-2xl bg-muted/40 p-3 text-sm outline-1 outline-black/5 resize-none focus:outline-primary"
          />
          <button
            disabled={!mood || addMut.isPending}
            onClick={() => addMut.mutate()}
            className="mt-3 w-full rounded-2xl bg-primary text-primary-foreground font-semibold py-3 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {addMut.isPending && <Loader2 className="size-4 animate-spin" />}
            Simpan
          </button>
        </section>

        <section>
          <h2 className="text-sm font-semibold mb-3">Riwayat</h2>
          {logs.length === 0 ? (
            <div className="rounded-2xl bg-card outline-1 outline-black/5">
              <EmptyState
                icon={Smile}
                title="Belum ada catatan mood"
                description="Pilih emoji di atas untuk mencatat perasaanmu hari ini."
              />
            </div>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => {
                const m = MOODS.find((x) => x.v === l.mood);
                return (
                  <li
                    key={l.id}
                    className="rounded-2xl bg-card p-3 outline-1 outline-black/5 flex gap-3"
                  >
                    <div className="size-11 rounded-xl bg-primary/10 grid place-items-center text-2xl">
                      {m?.e ?? "🙂"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{m?.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(l.logged_at as string).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {l.note && (
                        <p className="text-xs text-muted-foreground mt-0.5 break-words">{l.note}</p>
                      )}
                    </div>
                    <button
                      onClick={() => delMut.mutate(l.id as string)}
                      className="size-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-destructive transition"
                      aria-label="Hapus"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
