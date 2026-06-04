import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRecipe } from "@/lib/recipes.functions";
import { getRecipeRating, rateRecipe } from "@/lib/recipeRatings.functions";
import { isRecipeBookmarked, toggleRecipeBookmark } from "@/lib/recipeBookmarks.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Clock, Flame, Users, Star, Bookmark } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recipes/$id")({
  component: RecipeDetail,
});

function RecipeDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const fetch = useServerFn(getRecipe);
  const fetchRating = useServerFn(getRecipeRating);
  const rateFn = useServerFn(rateRecipe);
  const checkBm = useServerFn(isRecipeBookmarked);
  const toggleBm = useServerFn(toggleRecipeBookmark);
  const { data: r, isLoading } = useQuery({
    queryKey: ["recipe", id],
    queryFn: () => fetch({ data: { id } }),
  });
  const { data: rating } = useQuery({
    queryKey: ["recipe", id, "rating"],
    queryFn: () => fetchRating({ data: { recipe_id: id } }),
  });
  const { data: bm } = useQuery({
    queryKey: ["recipe", id, "bookmark"],
    queryFn: () => checkBm({ data: { recipe_id: id } }),
  });
  const bmM = useMutation({
    mutationFn: () => toggleBm({ data: { recipe_id: id } }),
    onSuccess: (res) => {
      toast.success(res.bookmarked ? "Resep disimpan" : "Bookmark dihapus");
      qc.invalidateQueries({ queryKey: ["recipe", id, "bookmark"] });
      qc.invalidateQueries({ queryKey: ["recipe-bookmarks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [stars, setStars] = useState(0);
  const [review, setReview] = useState("");
  useEffect(() => {
    if (rating?.myRating) setStars(rating.myRating);
    if (rating?.myReview) setReview(rating.myReview);
  }, [rating?.myRating, rating?.myReview]);

  const rateM = useMutation({
    mutationFn: () =>
      rateFn({ data: { recipe_id: id, rating: stars, review: review.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Rating tersimpan");
      qc.invalidateQueries({ queryKey: ["recipe", id, "rating"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title={r?.title ?? "Resep"}
          showBack
          action={
            <button
              onClick={() => bmM.mutate()}
              disabled={bmM.isPending}
              className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center"
              aria-label={bm?.bookmarked ? "Hapus bookmark" : "Simpan resep"}
            >
              <Bookmark className={`size-4 ${bm?.bookmarked ? "fill-primary text-primary" : ""}`} />
            </button>
          }
        />

        {isLoading && <p className="text-sm text-muted-foreground">Memuat...</p>}
        {r && (
          <>
            {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}

            <section className="grid grid-cols-3 gap-3">
              <Stat icon={<Flame className="size-4" />} label="Kalori" value={`${r.calories}`} />
              <Stat icon={<Clock className="size-4" />} label="Waktu" value={`${r.prep_min}m`} />
              <Stat icon={<Users className="size-4" />} label="Porsi" value={`${r.servings}`} />
            </section>

            <section className="grid grid-cols-3 gap-2">
              <Macro label="Protein" value={`${Number(r.protein_g)}g`} />
              <Macro label="Karbo" value={`${Number(r.carbs_g)}g`} />
              <Macro label="Lemak" value={`${Number(r.fat_g)}g`} />
            </section>

            <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5">
              <h2 className="font-bold mb-3">Bahan</h2>
              <ul className="space-y-1.5 text-sm">
                {(r.ingredients ?? []).map((it: string, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5">
              <h2 className="font-bold mb-3">Cara Membuat</h2>
              <ol className="space-y-2.5 text-sm">
                {(r.instructions ?? []).map((it: string, i: number) => (
                  <li key={i} className="flex gap-3">
                    <span className="size-6 shrink-0 bg-primary text-primary-foreground rounded-full grid place-items-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{it}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Rating</h2>
                {rating && rating.count > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ⭐ {rating.avg.toFixed(1)} · {rating.count} ulasan
                  </p>
                )}
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setStars(n)}
                    className="p-1"
                    aria-label={`${n} bintang`}
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
                onClick={() => rateM.mutate()}
                disabled={stars === 0 || rateM.isPending}
                className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50"
              >
                {rating?.myRating ? "Perbarui rating" : "Kirim rating"}
              </button>
            </section>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card p-3 rounded-2xl outline-1 outline-black/5 text-center">
      <div className="flex justify-center text-primary mb-1">{icon}</div>
      <p className="text-base font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card p-3 rounded-2xl outline-1 outline-black/5 text-center">
      <p className="text-sm font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
