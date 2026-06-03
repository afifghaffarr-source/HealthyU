import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVitals, addVitals, deleteVitals } from "@/lib/vitals.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Heart, Activity, Droplet, Trash2, WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { enqueue } from "@/lib/offline-queue";
import { useOfflineQueue } from "@/hooks/use-offline-queue";

export const Route = createFileRoute("/_authenticated/vitals")({
  component: VitalsPage,
});

function bpCategory(sys?: number | null, dia?: number | null) {
  if (!sys || !dia) return null;
  if (sys < 90 || dia < 60) return { label: "Rendah", color: "text-sky-600" };
  if (sys < 120 && dia < 80) return { label: "Normal", color: "text-emerald-600" };
  if (sys < 130 && dia < 80) return { label: "Tinggi", color: "text-amber-600" };
  if (sys < 140 || dia < 90) return { label: "Hipertensi 1", color: "text-orange-600" };
  return { label: "Hipertensi 2", color: "text-red-600" };
}

function glucoseCategory(mg?: number | null, state?: string | null) {
  if (!mg) return null;
  if (state === "fasting") {
    if (mg < 70) return { label: "Hipoglikemia", color: "text-red-600" };
    if (mg < 100) return { label: "Normal", color: "text-emerald-600" };
    if (mg < 126) return { label: "Pra-diabetes", color: "text-amber-600" };
    return { label: "Diabetes", color: "text-red-600" };
  }
  if (state === "post_meal") {
    if (mg < 140) return { label: "Normal", color: "text-emerald-600" };
    if (mg < 200) return { label: "Pra-diabetes", color: "text-amber-600" };
    return { label: "Diabetes", color: "text-red-600" };
  }
  return null;
}

function VitalsPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listVitals);
  const add = useServerFn(addVitals);
  const del = useServerFn(deleteVitals);
  const { online, pending, sync } = useOfflineQueue();

  const { data: logs = [] } = useQuery({ queryKey: ["vitals"], queryFn: () => fetchList() });

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
        await enqueue("vitals", payload);
        return { offline: true as const };
      }
      return add({ data: payload });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["vitals"] });
      setSys(""); setDia(""); setHr(""); setGlu(""); setNote("");
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
  const latestGlu = latest ? glucoseCategory(latest.glucose_mgdl ? Number(latest.glucose_mgdl) : null, latest.glucose_state) : null;

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/profile" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-2xl font-bold">Vital Signs</h1>
          {(!online || pending > 0) && (
            <button
              onClick={() => sync()}
              className={`ml-auto inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full ${online ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}
            >
              {online ? <RefreshCw className="size-3" /> : <WifiOff className="size-3" />}
              {online ? `Sync ${pending}` : `Offline${pending ? ` · ${pending}` : ""}`}
            </button>
          )}
        </header>

        {latest && (
          <section className="grid grid-cols-3 gap-2 animate-fade-up">
            <div className="bg-card p-3 rounded-2xl outline-1 outline-black/5 text-center">
              <Heart className="size-4 mx-auto text-coral mb-1" />
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Tekanan</p>
              <p className="text-sm font-bold tabular-nums">{latest.systolic ?? "-"}/{latest.diastolic ?? "-"}</p>
              {latestBp && <p className={`text-[10px] font-semibold ${latestBp.color}`}>{latestBp.label}</p>}
            </div>
            <div className="bg-card p-3 rounded-2xl outline-1 outline-black/5 text-center">
              <Activity className="size-4 mx-auto text-primary mb-1" />
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Detak</p>
              <p className="text-sm font-bold tabular-nums">{latest.heart_rate ?? "-"}</p>
              <p className="text-[10px] text-muted-foreground">bpm</p>
            </div>
            <div className="bg-card p-3 rounded-2xl outline-1 outline-black/5 text-center">
              <Droplet className="size-4 mx-auto text-sky-600 mb-1" />
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Gula</p>
              <p className="text-sm font-bold tabular-nums">{latest.glucose_mgdl ?? "-"}</p>
              {latestGlu && <p className={`text-[10px] font-semibold ${latestGlu.color}`}>{latestGlu.label}</p>}
            </div>
          </section>
        )}

        <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 space-y-3 animate-fade-up">
          <h2 className="font-bold text-sm">Catat pengukuran</h2>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Sistolik" value={sys} onChange={setSys} suffix="mmHg" />
            <Input label="Diastolik" value={dia} onChange={setDia} suffix="mmHg" />
            <Input label="Detak jantung" value={hr} onChange={setHr} suffix="bpm" />
            <Input label="Gula darah" value={glu} onChange={setGlu} suffix="mg/dL" />
          </div>
          {glu && (
            <div className="flex gap-2">
              {(["fasting", "post_meal", "random"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setState(s)}
                  className={`flex-1 text-[11px] font-semibold px-2 py-2 rounded-xl ${state === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  {s === "fasting" ? "Puasa" : s === "post_meal" ? "Setelah makan" : "Acak"}
                </button>
              ))}
            </div>
          )}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan (opsional)"
            className="w-full text-sm bg-muted rounded-xl px-3 py-2 outline-none"
          />
          <button
            onClick={() => addMut.mutate()}
            disabled={addMut.isPending || (!sys && !dia && !hr && !glu)}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50"
          >
            Simpan
          </button>
        </section>

        <section className="space-y-2 animate-fade-up">
          <h2 className="font-bold text-sm">Riwayat</h2>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada catatan</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(l.logged_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                  <p className="text-sm font-semibold">
                    {l.systolic && l.diastolic ? `${l.systolic}/${l.diastolic} mmHg` : ""}
                    {l.heart_rate ? ` · ${l.heart_rate} bpm` : ""}
                    {l.glucose_mgdl ? ` · ${l.glucose_mgdl} mg/dL` : ""}
                  </p>
                  {l.note && <p className="text-xs text-muted-foreground truncate">{l.note}</p>}
                </div>
                <button
                  onClick={() => delMut.mutate(l.id)}
                  className="size-8 grid place-items-center text-muted-foreground hover:text-red-600"
                  aria-label="Hapus"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function Input({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
      <div className="flex items-center bg-muted rounded-xl px-3 mt-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent py-2 text-sm outline-none tabular-nums"
        />
        <span className="text-[10px] text-muted-foreground">{suffix}</span>
      </div>
    </label>
  );
}