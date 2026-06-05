import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Clock, Loader2, Sparkles, X } from "lucide-react";
import {
  generateRecipeFromIngredients,
  type GeneratedRecipe,
} from "@/features/ai/lib/ai-extras.functions";
import { toastError } from "@/lib/toast-config";

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div className="bg-muted/60 rounded-xl p-2">
      <p className="text-sm font-bold">{v}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export function AiRecipeModal({ onClose }: { onClose: () => void }) {
  const genRecipe = useServerFn(generateRecipeFromIngredients);
  const [ingredients, setIngredients] = useState("");
  const [prefs, setPrefs] = useState("");
  const [generated, setGenerated] = useState<GeneratedRecipe | null>(null);

  const genMutation = useMutation({
    mutationFn: () => genRecipe({ data: { ingredients, preferences: prefs || undefined } }),
    onSuccess: (r) => setGenerated(r),
    onError: (e) => toastError(e, "Gagal membuat resep"),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> Resep AI
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        {!generated ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Bahan di kulkas</label>
              <textarea
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                rows={3}
                placeholder="contoh: telur, bayam, tahu, bawang putih"
                className="mt-1 w-full bg-muted/60 rounded-xl p-3 text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Preferensi (opsional)
              </label>
              <input
                value={prefs}
                onChange={(e) => setPrefs(e.target.value)}
                placeholder="rendah karbo, pedas, cepat..."
                className="mt-1 w-full bg-muted/60 rounded-xl p-3 text-sm outline-none"
              />
            </div>
            <button
              disabled={!ingredients.trim() || genMutation.isPending}
              onClick={() => genMutation.mutate()}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {genMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {genMutation.isPending ? "Membuat resep..." : "Buat Resep"}
            </button>
            <p className="text-[10px] text-muted-foreground text-center">
              Resep disesuaikan dengan kondisi kesehatan & alergi kamu.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-base">{generated.title}</h3>
              <p className="text-xs text-muted-foreground">{generated.description}</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Mini label="Kalori" v={`${generated.calories}`} />
              <Mini label="Protein" v={`${generated.protein_g}g`} />
              <Mini label="Karbo" v={`${generated.carbs_g}g`} />
              <Mini label="Lemak" v={`${generated.fat_g}g`} />
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {generated.prep_min} min
              </span>
              <span>{generated.servings} porsi</span>
            </div>
            <div>
              <p className="text-xs font-bold mb-2">Bahan</p>
              <ul className="text-sm space-y-1 list-disc pl-5">
                {generated.ingredients.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold mb-2">Cara membuat</p>
              <ol className="text-sm space-y-1.5 list-decimal pl-5">
                {generated.instructions.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ol>
            </div>
            {generated.tips.length > 0 && (
              <div className="bg-mint/40 rounded-xl p-3">
                <p className="text-xs font-bold mb-1">💡 Tips sehat</p>
                <ul className="text-xs space-y-1 list-disc pl-5">
                  {generated.tips.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => {
                setGenerated(null);
                setIngredients("");
                setPrefs("");
              }}
              className="w-full bg-muted rounded-xl py-2.5 text-sm font-semibold"
            >
              Buat resep lain
            </button>
          </div>
        )}
      </div>
    </div>
  );
}