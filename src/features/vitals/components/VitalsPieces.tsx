import { Heart, Activity, Droplet, Trash2 } from "lucide-react";
import { VitalInput } from "@/features/vitals/components/VitalInput";

type BpCat = { color: string; label: string } | null;
type GluCat = { color: string; label: string } | null;

export function LatestVitalsRow({
  latest,
  latestBp,
  latestGlu,
}: {
  latest: {
    systolic?: number | null;
    diastolic?: number | null;
    heart_rate?: number | null;
    glucose_mgdl?: number | string | null;
  };
  latestBp: BpCat;
  latestGlu: GluCat;
}) {
  return (
    <section className="grid grid-cols-3 gap-2 animate-fade-up">
      <div className="bg-card p-3 rounded-2xl outline-1 outline-black/5 text-center relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400 to-coral" />
        <Heart className="size-4 mx-auto text-coral mb-1" />
        <p className="text-[10px] font-bold uppercase text-muted-foreground">Tekanan</p>
        <p className="text-sm font-bold tabular-nums">
          {latest.systolic ?? "-"}/{latest.diastolic ?? "-"}
        </p>
        {latestBp && <p className={`text-[10px] font-semibold ${latestBp.color}`}>{latestBp.label}</p>}
      </div>
      <div className="bg-card p-3 rounded-2xl outline-1 outline-black/5 text-center relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-emerald-400" />
        <Activity className="size-4 mx-auto text-primary mb-1" />
        <p className="text-[10px] font-bold uppercase text-muted-foreground">Detak</p>
        <p className="text-sm font-bold tabular-nums">{latest.heart_rate ?? "-"}</p>
        <p className="text-[10px] text-muted-foreground">bpm</p>
      </div>
      <div className="bg-card p-3 rounded-2xl outline-1 outline-black/5 text-center relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 to-cyan-400" />
        <Droplet className="size-4 mx-auto text-sky-600 mb-1" />
        <p className="text-[10px] font-bold uppercase text-muted-foreground">Gula</p>
        <p className="text-sm font-bold tabular-nums">{latest.glucose_mgdl ?? "-"}</p>
        {latestGlu && (
          <p className={`text-[10px] font-semibold ${latestGlu.color}`}>{latestGlu.label}</p>
        )}
      </div>
    </section>
  );
}

export function AddVitalsForm({
  sys,
  setSys,
  dia,
  setDia,
  hr,
  setHr,
  glu,
  setGlu,
  state,
  setState,
  note,
  setNote,
  onSave,
  saving,
}: {
  sys: string;
  setSys: (v: string) => void;
  dia: string;
  setDia: (v: string) => void;
  hr: string;
  setHr: (v: string) => void;
  glu: string;
  setGlu: (v: string) => void;
  state: "fasting" | "post_meal" | "random";
  setState: (v: "fasting" | "post_meal" | "random") => void;
  note: string;
  setNote: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 space-y-3 animate-fade-up">
      <h2 className="font-bold text-sm">Catat pengukuran</h2>
      <div className="grid grid-cols-2 gap-2">
        <VitalInput label="Sistolik" value={sys} onChange={setSys} suffix="mmHg" />
        <VitalInput label="Diastolik" value={dia} onChange={setDia} suffix="mmHg" />
        <VitalInput label="Detak jantung" value={hr} onChange={setHr} suffix="bpm" />
        <VitalInput label="Gula darah" value={glu} onChange={setGlu} suffix="mg/dL" />
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
        onClick={onSave}
        disabled={saving || (!sys && !dia && !hr && !glu)}
        className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50"
      >
        Simpan
      </button>
    </section>
  );
}

export function VitalsHistoryList({
  logs,
  onDelete,
}: {
  logs: {
    id: string;
    logged_at: string;
    systolic?: number | null;
    diastolic?: number | null;
    heart_rate?: number | null;
    glucose_mgdl?: number | string | null;
    note?: string | null;
  }[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className="space-y-2 animate-fade-up">
      <h2 className="font-bold text-sm">Riwayat</h2>
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Belum ada catatan</p>
      ) : (
        logs.map((l) => (
          <div
            key={l.id}
            className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">
                {new Date(l.logged_at).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <p className="text-sm font-semibold">
                {l.systolic && l.diastolic ? `${l.systolic}/${l.diastolic} mmHg` : ""}
                {l.heart_rate ? ` · ${l.heart_rate} bpm` : ""}
                {l.glucose_mgdl ? ` · ${l.glucose_mgdl} mg/dL` : ""}
              </p>
              {l.note && <p className="text-xs text-muted-foreground truncate">{l.note}</p>}
            </div>
            <button
              onClick={() => onDelete(l.id)}
              className="size-8 grid place-items-center text-muted-foreground hover:text-red-600"
              aria-label="Hapus"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))
      )}
    </section>
  );
}