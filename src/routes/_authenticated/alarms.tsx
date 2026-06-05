import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { listSmartAlarms, upsertSmartAlarm } from "@/lib/scanBatch9.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/alarms")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSmartAlarms);
  const upsertFn = useServerFn(upsertSmartAlarm);
  const { data } = useQuery({
    queryKey: ["alarms"],
    queryFn: () => listFn({ data: undefined as never }),
  });
  const [time, setTime] = useState("06:30");
  const [win, setWin] = useState(30);
  const mut = useMutation({
    mutationFn: () => upsertFn({ data: { wakeTime: time, windowMin: win, enabled: true } }),
    onSuccess: () => {
      toast.success("Alarm tersimpan");
      qc.invalidateQueries({ queryKey: ["alarms"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Smart Alarm" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <label className="text-sm">Waktu bangun</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
          <label className="text-sm">Window (menit) — bangun di fase tidur ringan</label>
          <input
            type="number"
            min={5}
            max={60}
            value={win}
            onChange={(e) => setWin(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
          >
            Simpan
          </button>
        </div>
        <div className="space-y-2">
          {(data?.alarms ?? []).map((a) => (
            <div key={a.id} className="flex justify-between p-3 rounded-xl bg-card border text-sm">
              <span>{a.wake_time}</span>
              <span className="text-muted-foreground">±{a.window_min}m</span>
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
