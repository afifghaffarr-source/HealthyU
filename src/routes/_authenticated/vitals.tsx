import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listVitals, addVitals, deleteVitals } from "@/lib/vitals.functions";
import { listBodyMetrics, addBodyMetrics, deleteBodyMetrics } from "@/lib/bodyMetrics.functions";
import { getProfile } from "@/lib/profile.functions";
import {
  bmi as calcBmi,
  bmiCategory,
  bmr as calcBmr,
  tdee as calcTdee,
  waterTargetMl,
  ageFromBirthDate,
} from "@/lib/localCalc";
import { BottomNav } from "@/components/bottom-nav";
import { Heart, Activity, Droplet, Trash2, Ruler, ChevronDown, TrendingUp } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { SyncPill } from "@/components/healthyu/sync-pill";
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
  const fetchBody = useServerFn(listBodyMetrics);
  const addBody = useServerFn(addBodyMetrics);
  const delBody = useServerFn(deleteBodyMetrics);
  const fetchProfile = useServerFn(getProfile);
  const { online, pending, sync } = useOfflineQueue();

  const { data: logs = [] } = useQuery({ queryKey: ["vitals"], queryFn: () => fetchList() });
  const { data: bodyLogs = [] } = useQuery({ queryKey: ["body_metrics"], queryFn: () => fetchBody() });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [hr, setHr] = useState("");
  const [glu, setGlu] = useState("");
  const [state, setState] = useState<"fasting" | "post_meal" | "random">("fasting");
  const [note, setNote] = useState("");

  const [bodyOpen, setBodyOpen] = useState(false);
  type BodyField =
    | "weight_kg" | "body_fat_pct" | "muscle_mass_kg" | "water_pct" | "visceral_fat"
    | "waist_cm" | "hip_cm" | "chest_cm" | "neck_cm" | "calf_cm"
    | "bicep_left_cm" | "bicep_right_cm" | "thigh_left_cm" | "thigh_right_cm";
  const [body, setBody] = useState<Record<BodyField, string>>({
    weight_kg: "", body_fat_pct: "", muscle_mass_kg: "", water_pct: "", visceral_fat: "",
    waist_cm: "", hip_cm: "", chest_cm: "", neck_cm: "", calf_cm: "",
    bicep_left_cm: "", bicep_right_cm: "", thigh_left_cm: "", thigh_right_cm: "",
  });
  const setBodyVal = (k: BodyField, v: string) => setBody((p) => ({ ...p, [k]: v }));

  const addBodyMut = useMutation({
    mutationFn: () => {
      const payload: Record<string, number> = {};
      (Object.keys(body) as BodyField[]).forEach((k) => {
        if (body[k] !== "") payload[k] = Number(body[k]);
      });
      return addBody({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["body_metrics"] });
      setBody({
        weight_kg: "", body_fat_pct: "", muscle_mass_kg: "", water_pct: "", visceral_fat: "",
        waist_cm: "", hip_cm: "", chest_cm: "", neck_cm: "", calf_cm: "",
        bicep_left_cm: "", bicep_right_cm: "", thigh_left_cm: "", thigh_right_cm: "",
      });
      toast.success("Komposisi tubuh tercatat");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delBodyMut = useMutation({
    mutationFn: (id: string) => delBody({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body_metrics"] }),
  });

  const whrLatest = bodyLogs[0]?.waist_cm && bodyLogs[0]?.hip_cm
    ? Number(bodyLogs[0].waist_cm) / Number(bodyLogs[0].hip_cm)
    : null;

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

  const recentBp = logs
    .filter((l) => l.systolic && l.diastolic)
    .slice(0, 7)
    .reverse() as Array<{ id: string; systolic: number; diastolic: number; logged_at: string }>;
  const bpMax = Math.max(160, ...recentBp.map((r) => r.systolic ?? 0));
  const bpMin = Math.min(60, ...recentBp.map((r) => r.diastolic ?? 0));

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Vital Signs"
          showBack
          action={<SyncPill online={online} pending={pending} onSync={() => sync()} />}
        />

        {(() => {
          const weight = Number(bodyLogs[0]?.weight_kg ?? profile?.weight_kg ?? 0);
          const height = Number(profile?.height_cm ?? 0);
          const age = ageFromBirthDate(profile?.birth_date as string | null | undefined);
          const activity = profile?.activity_level ?? "sedentary";
          if (!weight || !height || !age) return null;
          const bmiVal = calcBmi(weight, height);
          const cat = bmiCategory(bmiVal);
          const bmrVal = calcBmr({ weightKg: weight, heightCm: height, ageYears: age, gender: profile?.gender });
          const tdeeVal = calcTdee(bmrVal, activity);
          const waterMl = waterTargetMl(weight, activity);
          const catColor =
            cat === "normal" ? "text-emerald-600"
            : cat === "underweight" ? "text-sky-600"
            : cat === "overweight" ? "text-amber-600" : "text-red-600";
          const catLabel =
            cat === "normal" ? "Normal"
            : cat === "underweight" ? "Kurus"
            : cat === "overweight" ? "Berlebih" : "Obesitas";
          return (
            <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">
                Snapshot · dihitung otomatis
              </p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">BMI</p>
                  <p className="text-sm font-bold tabular-nums">{bmiVal.toFixed(1)}</p>
                  <p className={`text-[10px] font-semibold ${catColor}`}>{catLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">BMR</p>
                  <p className="text-sm font-bold tabular-nums">{bmrVal}</p>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">TDEE</p>
                  <p className="text-sm font-bold tabular-nums">{tdeeVal}</p>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Air</p>
                  <p className="text-sm font-bold tabular-nums">{(waterMl / 1000).toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground">L/hari</p>
                </div>
              </div>
            </section>
          );
        })()}

        {latest && (
          <section className="grid grid-cols-3 gap-2 animate-fade-up">
            <div className="bg-card p-3 rounded-2xl outline-1 outline-black/5 text-center relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-400 to-coral" />
              <Heart className="size-4 mx-auto text-coral mb-1" />
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Tekanan</p>
              <p className="text-sm font-bold tabular-nums">{latest.systolic ?? "-"}/{latest.diastolic ?? "-"}</p>
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
              {latestGlu && <p className={`text-[10px] font-semibold ${latestGlu.color}`}>{latestGlu.label}</p>}
            </div>
          </section>
        )}

        {recentBp.length >= 2 && (
          <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 animate-fade-up">
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="size-3" /> Tren tekanan darah
              </div>
              <span className="text-[10px] text-muted-foreground">{recentBp.length} catatan</span>
            </div>
            <svg viewBox="0 0 280 80" className="w-full h-20">
              {(() => {
                const stepX = recentBp.length > 1 ? 280 / (recentBp.length - 1) : 0;
                const range = Math.max(1, bpMax - bpMin);
                const sysPts = recentBp.map((r, i) => `${i * stepX},${80 - ((r.systolic - bpMin) / range) * 70 - 5}`).join(" ");
                const diaPts = recentBp.map((r, i) => `${i * stepX},${80 - ((r.diastolic - bpMin) / range) * 70 - 5}`).join(" ");
                return (
                  <>
                    <polyline points={sysPts} fill="none" stroke="hsl(var(--coral, 0 80% 65%))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                    <polyline points={diaPts} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 3" strokeLinejoin="round" strokeLinecap="round" />
                    {recentBp.map((r, i) => (
                      <g key={r.id}>
                        <circle cx={i * stepX} cy={80 - ((r.systolic - bpMin) / range) * 70 - 5} r="2.5" className="fill-coral" />
                        <circle cx={i * stepX} cy={80 - ((r.diastolic - bpMin) / range) * 70 - 5} r="2" className="fill-primary" />
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
            <div className="flex items-center justify-center gap-4 text-[10px] mt-1">
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-coral" /> Sistolik</span>
              <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-primary" /> Diastolik</span>
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

        <section className="bg-card rounded-3xl outline-1 outline-black/5 animate-fade-up">
          <button
            onClick={() => setBodyOpen((o) => !o)}
            className="w-full px-4 py-3 flex items-center gap-2"
          >
            <Ruler className="size-4 text-primary" />
            <h2 className="font-bold text-sm flex-1 text-left">Komposisi Tubuh & Lingkar</h2>
            {whrLatest && (
              <span className="text-[10px] text-muted-foreground">
                W/H {whrLatest.toFixed(2)}
              </span>
            )}
            <ChevronDown className={`size-4 text-muted-foreground transition ${bodyOpen ? "rotate-180" : ""}`} />
          </button>
          {bodyOpen && (
            <div className="px-4 pb-4 space-y-3">
              <p className="text-[11px] text-muted-foreground">Isi yang tersedia, kosongkan jika tidak diukur.</p>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Komposisi</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Berat" value={body.weight_kg} onChange={(v) => setBodyVal("weight_kg", v)} suffix="kg" />
                  <Input label="Lemak" value={body.body_fat_pct} onChange={(v) => setBodyVal("body_fat_pct", v)} suffix="%" />
                  <Input label="Otot" value={body.muscle_mass_kg} onChange={(v) => setBodyVal("muscle_mass_kg", v)} suffix="kg" />
                  <Input label="Air" value={body.water_pct} onChange={(v) => setBodyVal("water_pct", v)} suffix="%" />
                  <Input label="Visceral fat" value={body.visceral_fat} onChange={(v) => setBodyVal("visceral_fat", v)} suffix="" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Lingkar tubuh</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Pinggang" value={body.waist_cm} onChange={(v) => setBodyVal("waist_cm", v)} suffix="cm" />
                  <Input label="Pinggul" value={body.hip_cm} onChange={(v) => setBodyVal("hip_cm", v)} suffix="cm" />
                  <Input label="Dada" value={body.chest_cm} onChange={(v) => setBodyVal("chest_cm", v)} suffix="cm" />
                  <Input label="Leher" value={body.neck_cm} onChange={(v) => setBodyVal("neck_cm", v)} suffix="cm" />
                  <Input label="Betis" value={body.calf_cm} onChange={(v) => setBodyVal("calf_cm", v)} suffix="cm" />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Lengan & paha</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Bisep kiri" value={body.bicep_left_cm} onChange={(v) => setBodyVal("bicep_left_cm", v)} suffix="cm" />
                  <Input label="Bisep kanan" value={body.bicep_right_cm} onChange={(v) => setBodyVal("bicep_right_cm", v)} suffix="cm" />
                  <Input label="Paha kiri" value={body.thigh_left_cm} onChange={(v) => setBodyVal("thigh_left_cm", v)} suffix="cm" />
                  <Input label="Paha kanan" value={body.thigh_right_cm} onChange={(v) => setBodyVal("thigh_right_cm", v)} suffix="cm" />
                </div>
              </div>
              <button
                onClick={() => addBodyMut.mutate()}
                disabled={addBodyMut.isPending || Object.values(body).every((v) => v === "")}
                className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50"
              >
                Simpan komposisi
              </button>

              {bodyLogs.length > 0 && (
                <div className="pt-2 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Riwayat (30 terakhir)</p>
                  {bodyLogs.slice(0, 10).map((b) => (
                    <div key={b.id} className="bg-muted/40 rounded-xl px-3 py-2 flex items-start gap-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(b.measured_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                        </p>
                        <p className="font-semibold tabular-nums">
                          {b.weight_kg ? `${b.weight_kg}kg` : ""}
                          {b.body_fat_pct ? ` · lemak ${b.body_fat_pct}%` : ""}
                          {b.waist_cm ? ` · pinggang ${b.waist_cm}cm` : ""}
                          {b.hip_cm ? ` · pinggul ${b.hip_cm}cm` : ""}
                        </p>
                      </div>
                      <button onClick={() => delBodyMut.mutate(b.id)} className="text-muted-foreground hover:text-red-600">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
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