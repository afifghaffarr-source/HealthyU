import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { listSleepDiary, upsertSleepDiary } from "@/lib/scanBatch11.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sleep/diary")({ component: Page });

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
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Sleep Diary" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs">Tidur</label><input type="time" value={bt} onChange={(e) => setBt(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background" /></div>
            <div><label className="text-xs">Bangun</label><input type="time" value={wt} onChange={(e) => setWt(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background" /></div>
          </div>
          <label className="text-xs">Kualitas: {q}/5</label>
          <input type="range" min={1} max={5} value={q} onChange={(e) => setQ(Number(e.target.value))} className="w-full" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan…" rows={2} className="w-full px-3 py-2 rounded-lg border bg-background" />
          <button onClick={() => mut.mutate()} disabled={mut.isPending} className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm">Simpan</button>
        </div>
        <div className="space-y-2">
          {(data?.entries ?? []).map((e: any) => (
            <div key={e.id} className="rounded-xl bg-card border p-3 text-sm">
              <div className="flex justify-between"><b>{e.diary_date}</b><span>⭐ {e.quality ?? "-"}</span></div>
              <div className="text-muted-foreground text-xs">{e.bedtime} → {e.wake_time}</div>
              {e.notes && <p className="mt-1">{e.notes}</p>}
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}