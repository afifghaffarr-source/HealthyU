import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, Loader2 } from "lucide-react";
import { rateRecipe } from "@/features/recipes/lib/recipeRatings.functions";
import { toast } from "@/lib/toast-config";

/**
 * Rating form for the public /resep/$slug page.
 * Receives an auth-aware rating state object (from getRatingStateForSlug) and
 * lets the user submit / update their rating. The mutation re-uses the
 * existing rateRecipe server fn (which targets `recipes` table by id).
 */
export type RatingState = {
  authenticated: boolean;
  count: number;
  avg: number;
  myRating: number | null;
  myReview: string | null;
  recipesId: string | null;
};

type Props = {
  slug: string;
  state: RatingState;
};

export function RatingForm({ slug, state }: Props) {
  const qc = useQueryClient();
  const [stars, setStars] = useState<number>(state.myRating ?? 0);
  const [review, setReview] = useState<string>(state.myReview ?? "");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store/async-query sync; `useSyncExternalStore` and equivalent restructure would change the API surface
    if (state.myRating) setStars(state.myRating);
    if (state.myReview) setReview(state.myReview);
  }, [state.myRating, state.myReview]);

  const rateFn = useServerFn(rateRecipe);
  const mut = useMutation({
    mutationFn: () => {
      if (!state.recipesId) throw new Error("Resep belum siap di-rating");
      if (stars === 0) throw new Error("Pilih bintang dulu");
      return rateFn({
        data: { recipe_id: state.recipesId, rating: stars, review: review.trim() || undefined },
      });
    },
    onSuccess: () => {
      toast.success("Rating tersimpan");
      qc.invalidateQueries({ queryKey: ["rating-state", slug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auth CTA if anonymous
  if (!state.authenticated) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card/40 p-5 text-center space-y-2">
        <div className="flex justify-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className="size-5 text-muted-foreground/50" />
          ))}
        </div>
        <p className="text-sm font-semibold">
          {state.count > 0
            ? `★ ${state.avg.toFixed(1)} · ${state.count} ulasan`
            : "Belum ada rating"}
        </p>
        <p className="text-xs text-muted-foreground">Login untuk kasih rating & review.</p>
      </section>
    );
  }

  return (
    <section className="bg-card p-5 rounded-2xl outline-1 outline-black/5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Rating</h2>
        {state.count > 0 && (
          <p className="text-xs text-muted-foreground">
            ⭐ {state.avg.toFixed(1)} · {state.count} ulasan
          </p>
        )}
      </div>
      <div className="flex gap-1.5" role="radiogroup" aria-label="Pilih rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            className="p-1"
            aria-label={`${n} bintang`}
            aria-checked={stars === n}
            role="radio"
          >
            <Star
              className={`size-7 transition ${n <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="Tulis ulasan (opsional)"
        rows={3}
        maxLength={500}
        className="w-full text-sm bg-muted rounded-xl px-3 py-2 outline-none resize-none"
      />
      <button
        type="button"
        onClick={() => mut.mutate()}
        disabled={stars === 0 || mut.isPending}
        className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50 inline-flex items-center justify-center gap-2"
      >
        {mut.isPending && <Loader2 className="size-4 animate-spin" />}
        {state.myRating ? "Perbarui rating" : "Kirim rating"}
      </button>
    </section>
  );
}
