import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  currentFast,
  startFast,
  stopFast,
  fastHistory,
} from "@/features/fasting/lib/fasting.functions";
import { getFastingSchedule, saveFastingSchedule } from "@/features/fasting/lib/fasting.functions";
import { getAchievementToastPrefix } from "@/lib/achievement-icons";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";
import {
  ActiveFastCard,
  ProtocolPicker,
  RamadhanScheduleCard,
  FastHistoryList,
  BreakFastTipsCard,
} from "@/features/fasting/components/FastingPieces";

export const Route = createFileRoute("/_authenticated/fasting")({
  component: FastingPage,
});

function FastingPage() {
  const qc = useQueryClient();
  const fetchFast = useServerFn(currentFast);
  const startFn = useServerFn(startFast);
  const stopFn = useServerFn(stopFast);

  const { data: fast } = useQuery({ queryKey: ["fast", "current"], queryFn: () => fetchFast() });
  const fetchHistory = useServerFn(fastHistory);
  const { data: history = [] } = useQuery({
    queryKey: ["fast", "history"],
    queryFn: () => fetchHistory(),
  });
  const fetchSchedule = useServerFn(getFastingSchedule);
  const saveScheduleFn = useServerFn(saveFastingSchedule);
  const { data: schedule } = useQuery({
    queryKey: ["fast", "schedule"],
    queryFn: () => fetchSchedule(),
  });
  const [ramadhan, setRamadhan] = useState(false);
  const [imsak, setImsak] = useState("04:30");
  const [iftar, setIftar] = useState("18:00");
  useEffect(() => {
    if (!schedule) return;
    setRamadhan(Boolean(schedule.is_ramadhan_mode));
    if (schedule.eating_window_end) setImsak(String(schedule.eating_window_end).slice(0, 5));
    if (schedule.eating_window_start) setIftar(String(schedule.eating_window_start).slice(0, 5));
  }, [schedule]);
  const saveSchedule = useMutation({
    mutationFn: (v: { ramadhan: boolean; imsak: string; iftar: string }) =>
      saveScheduleFn({
        data: {
          fasting_type: v.ramadhan ? "ramadhan" : "recurring",
          is_ramadhan_mode: v.ramadhan,
          is_active: true,
          eating_window_end: v.imsak,
          eating_window_start: v.iftar,
          enabled_days: [0, 1, 2, 3, 4, 5, 6],
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fast", "schedule"] });
      toast.success("Jadwal tersimpan");
    },
    onError: (e) => toastError(e, "Gagal"),
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!fast) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [fast]);

  const startMut = useMutation({
    mutationFn: (p: { protocol: string; target_hours: number }) => startFn({ data: p }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fast"] });
      toast.success("Puasa dimulai. Semangat!");
    },
  });
  const stopMut = useMutation({
    mutationFn: (id: string) => stopFn({ data: { id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["fast"] });
      qc.invalidateQueries({ queryKey: ["game", "summary"] });
      toast.success(r.completed ? "Selamat! Puasa tercapai 🎉" : "Puasa dihentikan");
      (r?.game?.newlyUnlocked ?? []).forEach((a) =>
        toast.success(`${getAchievementToastPrefix(a.icon)} ${a.title} terbuka!`),
      );
      setJustStopped(true);
      setTimeout(() => setJustStopped(false), 120000);
    },
  });
  const [justStopped, setJustStopped] = useState(false);

  const elapsedMs = fast ? now - new Date(fast.start_time).getTime() : 0;
  const elapsedHrs = elapsedMs / 3600000;
  const pct = fast ? Math.min(100, (elapsedHrs / Number(fast.target_hours)) * 100) : 0;

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Puasa" subtitle="Atur protokol & jadwal" showBack />

        {fast ? (
          <ActiveFastCard
            fast={fast}
            elapsedMs={elapsedMs}
            elapsedHrs={elapsedHrs}
            pct={pct}
            onStop={(id) => stopMut.mutate(id)}
            stopping={stopMut.isPending}
          />
        ) : (
          <>
            {justStopped && <BreakFastTipsCard />}
            <ProtocolPicker onStart={(p) => startMut.mutate(p)} starting={startMut.isPending} />
          </>
        )}

        <RamadhanScheduleCard
          ramadhan={ramadhan}
          setRamadhan={setRamadhan}
          imsak={imsak}
          setImsak={setImsak}
          iftar={iftar}
          setIftar={setIftar}
          onSave={() => saveSchedule.mutate({ ramadhan, imsak, iftar })}
          saving={saveSchedule.isPending}
        />

        <FastHistoryList history={history} />
      </div>
      <BottomNav />
    </main>
  );
}
