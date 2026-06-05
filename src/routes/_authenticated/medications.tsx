import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMedications,
  addMedication,
  deleteMedication,
  markMedicationTaken,
} from "@/features/medications/lib/medications.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Pill, Plus } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-config";
import {
  AddMedicationDialog,
  MedicationCard,
  TodayMedSummary,
} from "@/features/medications/components/MedicationPieces";

export const Route = createFileRoute("/_authenticated/medications")({
  component: MedsPage,
});

function MedsPage() {
  const qc = useQueryClient();
  const fetch = useServerFn(listMedications);
  const add = useServerFn(addMedication);
  const del = useServerFn(deleteMedication);
  const mark = useServerFn(markMedicationTaken);

  const { data } = useQuery({ queryKey: ["meds"], queryFn: () => fetch() });
  const meds = data?.medications ?? [];
  const logs = data?.todayLogs ?? [];

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);

  const addMut = useMutation({
    mutationFn: () =>
      add({
        data: {
          name,
          dose: dose || null,
          frequency: "daily",
          times,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meds"] });
      toast.success("Obat ditambahkan");
      setAdding(false);
      setName("");
      setDose("");
      setTimes(["08:00"]);
    },
    onError: (e) => toastError(e, "Gagal"),
  });

  const markMut = useMutation({
    mutationFn: (v: { medication_id: string; scheduled_time: string }) => mark({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meds"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meds"] }),
  });

  const isTaken = (medId: string, time: string) =>
    logs.some((l) => l.medication_id === medId && l.scheduled_time === time);

  const totalSlots = meds.reduce((a, m) => a + (m.times ?? []).length, 0);
  const doneSlots = meds.reduce(
    (a, m) => a + (m.times ?? []).filter((t: string) => isTaken(m.id, t)).length,
    0,
  );
  const pct = totalSlots ? Math.round((doneSlots / totalSlots) * 100) : 0;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const allUpcoming = meds.flatMap((m) =>
    (m.times ?? []).map((t: string) => {
      const [h, mm] = t.split(":").map(Number);
      return { med: m, time: t, mins: h * 60 + mm };
    }),
  );
  const next = allUpcoming
    .filter((x) => x.mins >= nowMin && !isTaken(x.med.id, x.time))
    .sort((a, b) => a.mins - b.mins)[0];

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Obat & Vitamin"
          showBack
          action={
            <button
              onClick={() => setAdding(true)}
              aria-label="Tambah obat"
              className="size-10 bg-primary text-primary-foreground rounded-2xl grid place-items-center"
            >
              <Plus className="size-5" />
            </button>
          }
        />

        {meds.length > 0 && (
          <TodayMedSummary
            doneSlots={doneSlots}
            totalSlots={totalSlots}
            pct={pct}
            next={next ? { med: next.med, time: next.time } : null}
          />
        )}

        {meds.length === 0 ? (
          <div className="bg-card p-6 rounded-3xl outline-1 outline-black/5 text-center animate-fade-up">
            <Pill className="size-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">Belum ada obat terdaftar</p>
            <button
              onClick={() => setAdding(true)}
              className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl"
            >
              Tambah obat
            </button>
          </div>
        ) : (
          meds.map((m) => (
            <MedicationCard
              key={m.id}
              m={m}
              isTaken={(t) => isTaken(m.id, t)}
              onMark={(t) => markMut.mutate({ medication_id: m.id, scheduled_time: t })}
              onDelete={() => delMut.mutate(m.id)}
            />
          ))
        )}
      </div>

      {adding && (
        <AddMedicationDialog
          name={name}
          setName={setName}
          dose={dose}
          setDose={setDose}
          times={times}
          setTimes={setTimes}
          onClose={() => setAdding(false)}
          onSubmit={() => addMut.mutate()}
          submitting={addMut.isPending}
        />
      )}
      <BottomNav />
    </main>
  );
}