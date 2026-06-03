import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMedications,
  addMedication,
  deleteMedication,
  markMedicationTaken,
} from "@/lib/medications.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Pill, Check, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

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
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
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

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Obat & Vitamin"
          showBack
          action={
            <button
              onClick={() => setAdding(true)}
              className="size-10 bg-primary text-primary-foreground rounded-2xl grid place-items-center"
            >
              <Plus className="size-5" />
            </button>
          }
        />

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
            <section key={m.id} className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
              <div className="flex items-start gap-3 mb-3">
                <div className="size-11 rounded-2xl bg-pink-100 grid place-items-center">
                  <Pill className="size-5 text-pink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{m.name}</p>
                  {m.dose && <p className="text-xs text-muted-foreground">{m.dose}</p>}
                </div>
                <button onClick={() => delMut.mutate(m.id)} className="text-muted-foreground hover:text-destructive p-1">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(m.times ?? []).map((t: string) => {
                  const taken = isTaken(m.id, t);
                  return (
                    <button
                      key={t}
                      onClick={() => !taken && markMut.mutate({ medication_id: m.id, scheduled_time: t })}
                      disabled={taken}
                      className={`px-3 py-2 rounded-2xl text-xs font-semibold inline-flex items-center gap-1.5 ${
                        taken ? "bg-mint text-sage-deep" : "bg-background outline-1 outline-black/10"
                      }`}
                    >
                      {taken && <Check className="size-3.5" />} {t}
                    </button>
                  );
                })}
                {(m.times ?? []).length === 0 && (
                  <span className="text-xs text-muted-foreground">Tidak terjadwal</span>
                )}
              </div>
            </section>
          ))
        )}
      </div>

      {adding && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setAdding(false)}
        >
          <div
            className="bg-background w-full max-w-md mx-auto rounded-t-3xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-bold">Tambah obat / vitamin</h3>
              <button onClick={() => setAdding(false)}><X className="size-5" /></button>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama (mis. Vitamin D)"
              className="w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm"
            />
            <input
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              placeholder="Dosis (mis. 1000 IU)"
              className="w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm"
            />
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Jadwal</p>
              <div className="flex flex-wrap gap-2">
                {times.map((t, i) => (
                  <div key={i} className="inline-flex items-center gap-1 bg-card outline-1 outline-black/10 rounded-2xl px-2 py-1">
                    <input
                      type="time"
                      value={t}
                      onChange={(e) => {
                        const copy = [...times];
                        copy[i] = e.target.value;
                        setTimes(copy);
                      }}
                      className="bg-transparent text-sm"
                    />
                    <button onClick={() => setTimes(times.filter((_, idx) => idx !== i))}>
                      <X className="size-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setTimes([...times, "12:00"])}
                  className="px-3 py-1.5 rounded-2xl bg-mint text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Plus className="size-3" /> Jam
                </button>
              </div>
            </div>
            <button
              onClick={() => name.trim() && addMut.mutate()}
              disabled={!name.trim() || addMut.isPending}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl"
            >
              Simpan
            </button>
          </div>
        </div>
      )}
      <BottomNav />
    </main>
  );
}