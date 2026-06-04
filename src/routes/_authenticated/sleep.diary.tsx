import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { listSleepDiary, upsertSleepDiary } from "@/lib/scanBatch11.functions";
import { toast } from "sonner";
import { Moon, Sunrise, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sleep/diary")({ component: Page });

function durationHours(bed: string, wake: string) {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSleepDiary);
  const upsertFn = useServerFn(upsertSleepDiary);
  const { data } = useQuery({ queryKey: ["sleep-diary"], queryFn: () => listFn({ data: undefined as never }) });
  const today = new Date().toISOString().slice(0, 10);
  const [bt, setBt] = useState("22:00");
  const [wt, setWt] = useState("06:00");
  const [q, setQ] = useState(4);
  const [notes, setNotes] = useState("");
  const mut = useMutation({
    mutationFn: () => upsertFn({ data: { diaryDate: today, bedtime: bt, wakeTime: wt, quality: q, notes: notes || undefined } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["sleep-diary"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const dur = durationHours(bt, wt);
  const entries = (data?.entries ?? []) as Array<{ id: string; diary_date: string; bedtime: string | null; wake_time: string | null; quality: number | null; notes: string | null }>;
  const avg7 = entries.slice(0, 7);
  const avgDur = avg7.length ? avg7.reduce((a, e) => a + (e.bedtime && e.wake_time ? durationHours(e.bedtime, e.wake_time) : 0), 0) / avg7.length : 0;
  const avgQ = avg7.length ? avg7.reduce((a, e) => a + (e.quality ?? 0), 0) / avg7.length : 0;

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Sleep Diary" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4 animate-fade-up">
        <section className="rounded-3xl p-5 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white outline-1 outline-black/5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider opacity-80">
            <Moon className="size-3.5" /> Tidur malam ini
          </div>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-5xl font-black tabular-nums leading-none">{dur.toFixed(1)}</span>
            <span className="pb-1 text-sm opacity-80">jam</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1"><Moon className="size-3" /> {bt}</span>
            <span className="inline-flex items-center gap-1"><Sunrise className="size-3" /> {wt}</span>
          </div>
        </section>

        <section className="rounded-3xl bg-card outline-1 outline-black/5 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Jam tidur</label>
              <input type="time" value={bt} onChange={(e) => setBt(e.target.value)} className="w-full px-3 py-2.5 rounded-xl outline-1 outline-black/10 bg-background" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground">Jam bangun</label>
              <input type="time" value={wt} onChange={(e) => setWt(e.target.value)} className="w-full px-3 py-2.5 rounded-xl outline-1 outline-black/10 bg-background" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-muted-foreground">Kualitas</span>
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`size-3.5 ${i < q ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </span>
            </div>
            <input type="range" min={1} max={5} value={q} onChange={(e) => setQ(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan (mimpi, gangguan, dll)…" rows={2} className="w-full px-3 py-2 rounded-xl outline-1 outline-black/10 bg-background text-sm" />
          <button onClick={() => mut.mutate()} disabled={mut.isPending} className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50">Simpan</button>
        </section>

        {avg7.length > 0 && (
          <section className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-card outline-1 outline-black/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rata-rata 7 hari</p>
              <p className="mt-1 text-xl font-black tabular-nums">{avgDur.toFixed(1)}<span className="text-xs font-semibold text-muted-foreground"> jam</span></p>
            </div>
            <div className="rounded-2xl bg-card outline-1 outline-black/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Kualitas rata-rata</p>
              <p className="mt-1 text-xl font-black tabular-nums">{avgQ.toFixed(1)}<span className="text-xs font-semibold text-muted-foreground"> /5</span></p>
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="font-bold text-sm">Riwayat</h2>
          {entries.map((e) => {
            const d = e.bedtime && e.wake_time ? durationHours(e.bedtime, e.wake_time) : 0;
            return (
              <div key={e.id} className="rounded-2xl bg-card outline-1 outline-black/5 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <b className="text-sm">{e.diary_date}</b>
                  <span className="inline-flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`size-3 ${i < (e.quality ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </span>
                </div>
                <div className="text-muted-foreground text-xs mt-0.5 flex items-center gap-2">
                  <span>{e.bedtime} → {e.wake_time}</span>
                  <span className="font-semibold text-foreground tabular-nums">{d.toFixed(1)}j</span>
                </div>
                {e.notes && <p className="mt-1.5 text-xs">{e.notes}</p>}
              </div>
            );
          })}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}