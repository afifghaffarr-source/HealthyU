import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Star, Loader2 } from "lucide-react";
import { addRecipeReview } from "@/features/scan/lib/scanGamification2.functions";
import {
  listReviewsForSlug,
  type PublicReview,
} from "@/features/recipes/lib/recipeReviewsPublic.functions";
import { toast } from "@/lib/toast-config";

type Props = {
  slug: string;
  isAuthed: boolean;
  /** recipes.id (UUID) needed for review submission. null if not resolved. */
  recipesId: string | null;
};

/**
 * Reviews section for the public /resep/$slug page.
 * - Anon: shows top reviews read-only + "Login untuk review" CTA.
 * - Authed: shows top reviews + form to submit / update own review.
 */
export function ReviewsSection({ slug, isAuthed, recipesId }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");

  const listFn = useServerFn(listReviewsForSlug);
  const { data: reviews = [] } = useQuery<PublicReview[]>({
    queryKey: ["reviews-for-slug", slug],
    queryFn: () => listFn({ data: { slug, limit: 5 } }),
    staleTime: 30_000,
  });

  const addFn = useServerFn(addRecipeReview);
  const mut = useMutation({
    mutationFn: () => {
      if (!recipesId) throw new Error("Resep belum siap di-review");
      return addFn({ data: { recipeId: recipesId, rating, review: text || undefined } });
    },
    onSuccess: () => {
      toast.success("Review terkirim");
      setText("");
      qc.invalidateQueries({ queryKey: ["reviews-for-slug", slug] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ulasan</h2>
        {reviews.length > 0 && (
          <span className="text-xs text-muted-foreground">{reviews.length} ulasan</span>
        )}
      </div>

      {isAuthed && (
        <div className="rounded-2xl bg-card border p-4 space-y-3">
          <p className="text-sm font-semibold">Tulis review</p>
          <div className="flex gap-1" role="radiogroup" aria-label="Pilih rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-checked={rating === n}
                role="radio"
                aria-label={`${n} bintang`}
              >
                <Star
                  className={`size-6 ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted"}`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Tulis review (opsional)"
            maxLength={2000}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          />
          <button
            type="button"
            onClick={() => mut.mutate()}
            disabled={!recipesId || mut.isPending}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {mut.isPending && <Loader2 className="size-4 animate-spin" />}
            Kirim Review
          </button>
        </div>
      )}

      {!isAuthed && (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4 text-center text-xs text-muted-foreground">
          Login untuk menulis review.
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Belum ada review untuk resep ini.
        </p>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl bg-card border p-3 text-sm space-y-1">
              <div className="flex gap-0.5">
                {Array.from({ length: r.rating }).map((_, i) => (
                  <Star key={i} className="size-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              {r.review && <p>{r.review}</p>}
              <div className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleDateString("id-ID")}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
