import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, X } from "lucide-react";
import { remixRecipe } from "@/features/scan/lib/scanSocial.functions";
import { toast } from "@/lib/toast-config";

type Props = {
  open: boolean;
  onClose: () => void;
  recipesId: string;
  recipeTitle: string;
};

type RemixResult = {
  title: string;
  ingredients: string[];
  instructions: string[];
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  notes?: string;
};

/**
 * Modal for AI-powered recipe remixing (substitute ingredients, dietary tweaks).
 * Auth-required. Calls the existing remixRecipe server fn.
 */
export function RemixModal({ open, onClose, recipesId, recipeTitle }: Props) {
  const [sub, setSub] = useState("");
  const fn = useServerFn(remixRecipe);
  const mut = useMutation({
    mutationFn: () => fn({ data: { recipeId: recipesId, substitute: sub } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const result = (mut.data?.remix ?? null) as RemixResult | null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 grid place-items-end sm:place-items-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Remix ${recipeTitle}`}
    >
      <div
        className="bg-background w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-primary font-semibold inline-flex items-center gap-1">
              <Sparkles className="size-3" /> AI Remix
            </p>
            <h2 className="font-bold mt-1">{recipeTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 grid place-items-center rounded-full hover:bg-accent"
            aria-label="Tutup"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Substitusi / Permintaan</label>
          <input
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            placeholder="Ganti daging dengan tempe; rendah garam..."
            maxLength={200}
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !sub.trim()}
          className="w-full rounded-xl bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {mut.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Memproses...
            </>
          ) : (
            <>
              <Sparkles className="size-4" /> Remix
            </>
          )}
        </button>

        {result && (
          <div className="rounded-2xl bg-card border p-4 space-y-3 animate-fade-up">
            <h3 className="font-bold">{result.title || "Hasil remix"}</h3>
            {result.calories != null && (
              <div className="text-xs text-muted-foreground">
                {result.calories} kkal
                {result.protein_g != null && ` · P${result.protein_g}g`}
                {result.carbs_g != null && ` · K${result.carbs_g}g`}
                {result.fat_g != null && ` · L${result.fat_g}g`}
              </div>
            )}
            {result.ingredients?.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-1">Bahan</div>
                <ul className="list-disc pl-4 text-sm space-y-0.5">
                  {result.ingredients.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.instructions?.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-1">Langkah</div>
                <ol className="list-decimal pl-4 text-sm space-y-0.5">
                  {result.instructions.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ol>
              </div>
            )}
            {result.notes && <p className="text-xs text-muted-foreground italic">{result.notes}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
