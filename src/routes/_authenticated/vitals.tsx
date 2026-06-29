import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVitals, addVitals, deleteVitals } from "@/features/vitals/lib/vitals.functions";
import { listBodyMetrics } from "@/features/body/lib/bodyMetrics.functions";
import { getProfile } from "@/features/profile/lib/profile.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { SyncPill } from "@/components/healthyu/sync-pill";
import { toast } from "@/lib/toast-config";
import { enqueue } from "@/lib/offline-queue";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { bpCategory, glucoseCategory } from "@/features/vitals/lib/vitalsCalc";
import { SnapshotCard } from "@/features/vitals/components/SnapshotCard";
import { BpTrendChart } from "@/features/vitals/components/BpTrendChart";
import { BodyCompositionPanel } from "@/features/vitals/components/BodyCompositionPanel";
import {
  LatestVitalsRow,
  AddVitalsForm,
  VitalsHistoryList,
} from "@/features/vitals/components/VitalsPieces";

export const Route = createFileRoute("/_authenticated/vitals")({
  component: VitalsPage,
});

function VitalsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listVitals);
  const add = useServerFn(addVitals);
  const del = useServerFn(deleteVitals);
  const fetchBody = useServerFn(listBodyMetrics);
  const fetchProfile = useServerFn(getProfile);
  const { online, pending, sync } = useOfflineQueue();

  const { data: logs = [] } = useQuery({ queryKey: ["vitals"], queryFn: () => fetchList() });
  const { data: bodyLogs = [] } = useQuery({
    queryKey: ["body_metrics"],
    queryFn: () => fetchBody(),
  });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [hr, setHr] = useState("");
  const [glu, setGlu] = useState("");
  const [state, setState] = useState<"fasting" | "post_meal" | "random">("fasting");
  const [note, setNote] = useState("");

  const addMut = useMutation({
    mutationFn: async () => {
      const payload = {
        systolic: sys ? Number(sys) : undefined,
        diastolic: dia ? Number(dia) : undefined,
        heart_rate: hr ? Number(hr) : undefined,
        glucose_mgdl: glu ? Number(glu) : undefined,
        glucose_state: glu ? state : undefined,
        note: note.trim() || undefined,
      };
      if (!navigator.onLine) {
        await enqueue("vitals", payload).catch(() => {});
        return { offline: true as const };
      }
      return add({ data: payload });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["vitals"] });
      setSys("");
      setDia("");
      setHr("");
      setGlu("");
      setNote("");
      toast.success(
        res && "offline" in res && res.offline
          ? "Vitals disimpan offline. Akan sync otomatis."
          : "Vital signs tercatat",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vitals"] }),
  });

  const latest = logs[0];
  const latestBp = latest ? bpCategory(latest.systolic, latest.diastolic) : null;
  const latestGlu = latest
    ? glucoseCategory(
        latest.glucose_mgdl ? Number(latest.glucose_mgdl) : null,
        latest.glucose_state,
      )
    : null;

  const recentBp = logs
    .filter((l) => l.systolic && l.diastolic)
    .slice(0, 7)
    .reverse() as Array<{ id: string; systolic: number; diastolic: number; logged_at: string }>;

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Vital Signs"
          showBack
          action={<SyncPill online={online} pending={pending} onSync={() => sync()} />}
        />

        <SnapshotCard
          profile={profile}
          latestWeightKg={bodyLogs[0]?.weight_kg as number | string | null | undefined}
        />

        {latest && <LatestVitalsRow latest={latest} latestBp={latestBp} latestGlu={latestGlu} />}

        <BpTrendChart recentBp={recentBp} />

        <AddVitalsForm
          sys={sys}
          setSys={setSys}
          dia={dia}
          setDia={setDia}
          hr={hr}
          setHr={setHr}
          glu={glu}
          setGlu={setGlu}
          state={state}
          setState={setState}
          note={note}
          setNote={setNote}
          onSave={() => addMut.mutate()}
          saving={addMut.isPending}
        />

        <VitalsHistoryList logs={logs} onDelete={(id) => delMut.mutate(id)} />

        <BodyCompositionPanel />
      </div>
      <BottomNav />
    </main>
  );
}
