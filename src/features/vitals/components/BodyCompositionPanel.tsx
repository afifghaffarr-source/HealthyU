import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Ruler, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  addBodyMetrics,
  deleteBodyMetrics,
  listBodyMetrics,
} from "@/features/body/lib/bodyMetrics.functions";
import { VitalInput } from "./VitalInput";

type BodyField =
  | "weight_kg"
  | "body_fat_pct"
  | "muscle_mass_kg"
  | "water_pct"
  | "visceral_fat"
  | "waist_cm"
  | "hip_cm"
  | "chest_cm"
  | "neck_cm"
  | "calf_cm"
  | "bicep_left_cm"
  | "bicep_right_cm"
  | "thigh_left_cm"
  | "thigh_right_cm";

const EMPTY: Record<BodyField, string> = {
  weight_kg: "",
  body_fat_pct: "",
  muscle_mass_kg: "",
  water_pct: "",
  visceral_fat: "",
  waist_cm: "",
  hip_cm: "",
  chest_cm: "",
  neck_cm: "",
  calf_cm: "",
  bicep_left_cm: "",
  bicep_right_cm: "",
  thigh_left_cm: "",
  thigh_right_cm: "",
};

export function BodyCompositionPanel() {
  const qc = useQueryClient();
  const fetchBody = useServerFn(listBodyMetrics);
  const addBody = useServerFn(addBodyMetrics);
  const delBody = useServerFn(deleteBodyMetrics);

  const { data: bodyLogs = [] } = useQuery({
    queryKey: ["body_metrics"],
    queryFn: () => fetchBody(),
  });

  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<Record<BodyField, string>>(EMPTY);
  const setVal = (k: BodyField, v: string) => setBody((p) => ({ ...p, [k]: v }));

  const addMut = useMutation({
    mutationFn: () => {
      const payload: Record<string, number> = {};
      (Object.keys(body) as BodyField[]).forEach((k) => {
        if (body[k] !== "") payload[k] = Number(body[k]);
      });
      return addBody({ data: payload });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["body_metrics"] });
      setBody(EMPTY);
      toast.success("Komposisi tubuh tercatat");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => delBody({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body_metrics"] }),
  });

  const whrLatest =
    bodyLogs[0]?.waist_cm && bodyLogs[0]?.hip_cm
      ? Number(bodyLogs[0].waist_cm) / Number(bodyLogs[0].hip_cm)
      : null;

  return (
    <section className="bg-card rounded-3xl outline-1 outline-black/5 animate-fade-up">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center gap-2"
      >
        <Ruler className="size-4 text-primary" />
        <h2 className="font-bold text-sm flex-1 text-left">Komposisi Tubuh & Lingkar</h2>
        {whrLatest && (
          <span className="text-[10px] text-muted-foreground">W/H {whrLatest.toFixed(2)}</span>
        )}
        <ChevronDown
          className={`size-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Isi yang tersedia, kosongkan jika tidak diukur.
          </p>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Komposisi</p>
            <div className="grid grid-cols-2 gap-2">
              <VitalInput
                label="Berat"
                value={body.weight_kg}
                onChange={(v) => setVal("weight_kg", v)}
                suffix="kg"
              />
              <VitalInput
                label="Lemak"
                value={body.body_fat_pct}
                onChange={(v) => setVal("body_fat_pct", v)}
                suffix="%"
              />
              <VitalInput
                label="Otot"
                value={body.muscle_mass_kg}
                onChange={(v) => setVal("muscle_mass_kg", v)}
                suffix="kg"
              />
              <VitalInput
                label="Air"
                value={body.water_pct}
                onChange={(v) => setVal("water_pct", v)}
                suffix="%"
              />
              <VitalInput
                label="Visceral fat"
                value={body.visceral_fat}
                onChange={(v) => setVal("visceral_fat", v)}
                suffix=""
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">
              Lingkar tubuh
            </p>
            <div className="grid grid-cols-2 gap-2">
              <VitalInput
                label="Pinggang"
                value={body.waist_cm}
                onChange={(v) => setVal("waist_cm", v)}
                suffix="cm"
              />
              <VitalInput
                label="Pinggul"
                value={body.hip_cm}
                onChange={(v) => setVal("hip_cm", v)}
                suffix="cm"
              />
              <VitalInput
                label="Dada"
                value={body.chest_cm}
                onChange={(v) => setVal("chest_cm", v)}
                suffix="cm"
              />
              <VitalInput
                label="Leher"
                value={body.neck_cm}
                onChange={(v) => setVal("neck_cm", v)}
                suffix="cm"
              />
              <VitalInput
                label="Betis"
                value={body.calf_cm}
                onChange={(v) => setVal("calf_cm", v)}
                suffix="cm"
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">
              Lengan & paha
            </p>
            <div className="grid grid-cols-2 gap-2">
              <VitalInput
                label="Bisep kiri"
                value={body.bicep_left_cm}
                onChange={(v) => setVal("bicep_left_cm", v)}
                suffix="cm"
              />
              <VitalInput
                label="Bisep kanan"
                value={body.bicep_right_cm}
                onChange={(v) => setVal("bicep_right_cm", v)}
                suffix="cm"
              />
              <VitalInput
                label="Paha kiri"
                value={body.thigh_left_cm}
                onChange={(v) => setVal("thigh_left_cm", v)}
                suffix="cm"
              />
              <VitalInput
                label="Paha kanan"
                value={body.thigh_right_cm}
                onChange={(v) => setVal("thigh_right_cm", v)}
                suffix="cm"
              />
            </div>
          </div>
          <button
            onClick={() => addMut.mutate()}
            disabled={addMut.isPending || Object.values(body).every((v) => v === "")}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50"
          >
            Simpan komposisi
          </button>

          {bodyLogs.length > 0 && (
            <div className="pt-2 space-y-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">
                Riwayat (30 terakhir)
              </p>
              {bodyLogs.slice(0, 10).map((b) => (
                <div
                  key={b.id}
                  className="bg-muted/40 rounded-xl px-3 py-2 flex items-start gap-2 text-xs"
                >
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
                  <button
                    onClick={() => delMut.mutate(b.id)}
                    className="text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
