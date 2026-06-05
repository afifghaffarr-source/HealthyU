import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  getFoodAlternatives,
  regenerateAlternativeReasons,
} from "@/features/food/lib/foodAlternatives.functions";

export type AltAddItem = {
  id: string;
  name: string;
  serving_unit?: string | null;
  calories: number | string;
  protein_g?: number | string | null;
  carbs_g?: number | string | null;
  fat_g?: number | string | null;
};

export function AlternativesModal({
  target,
  onClose,
  onAdd,
}: {
  target: { id: string; name: string };
  onClose: () => void;
  onAdd: (item: AltAddItem) => void;
}) {
  const qc = useQueryClient();
  const altFn = useServerFn(getFoodAlternatives);
  const regenFn = useServerFn(regenerateAlternativeReasons);

  const { data: alts = [], isLoading } = useQuery({
    queryKey: ["food-alternatives", target.id],
    queryFn: () => altFn({ data: { food_id: target.id } }),
  });
  const regenM = useMutation({
    mutationFn: () => regenFn({ data: { food_id: target.id } }),
    onSuccess: (r) => {
      toast.success(`AI memperbarui ${r.updated} penjelasan`);
      qc.invalidateQueries({ queryKey: ["food-alternatives", target.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-600" />
            Pengganti sehat
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Alternatif untuk <span className="font-semibold">{target.name}</span>
        </p>
        <button
          onClick={() => regenM.mutate()}
          disabled={regenM.isPending || alts.length === 0}
          className="w-full mb-3 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold py-2 rounded-xl disabled:opacity-50"
        >
          {regenM.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Sparkles className="size-3" />
          )}
          {regenM.isPending ? "AI menulis penjelasan…" : "Perbaiki penjelasan dengan AI"}
        </button>
        {isLoading && <p className="text-sm text-muted-foreground text-center py-6">Memuat…</p>}
        {!isLoading && alts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Belum ada saran pengganti untuk makanan ini.
          </p>
        )}
        <div className="space-y-2">
          {alts.map((a) => (
            <div key={a.id} className="bg-muted/40 rounded-2xl p-3 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-mint grid place-items-center text-base">🥗</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{a.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {Math.round(Number(a.calories))} kcal · P
                  {Math.round(Number(a.protein_g ?? 0))} K{Math.round(Number(a.carbs_g ?? 0))} L
                  {Math.round(Number(a.fat_g ?? 0))}
                </p>
                {a.reason && (
                  <p className="text-[10px] text-emerald-700 mt-0.5 line-clamp-2">{a.reason}</p>
                )}
              </div>
              <button
                onClick={() => {
                  onAdd({
                    id: a.id,
                    name: a.name,
                    serving_unit: a.serving_unit,
                    calories: a.calories,
                    protein_g: a.protein_g,
                    carbs_g: a.carbs_g,
                    fat_g: a.fat_g,
                  });
                  onClose();
                  toast.success(`${a.name} ditambah ke keranjang`);
                }}
                className="size-9 rounded-full bg-primary/10 text-primary grid place-items-center"
                aria-label="Tambah ke keranjang"
              >
                <Plus className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}