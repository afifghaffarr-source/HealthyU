import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { addRecipeReview, listRecipeReviews } from "@/lib/scanBatch9.functions";
import { toast } from "sonner";
import { Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recipes/$id/reviews")({ component: Page });

function Page() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const listFn = useServerFn(listRecipeReviews);
  const addFn = useServerFn(addRecipeReview);
  const { data } = useQuery({
    queryKey: ["reviews", id],
    queryFn: () => listFn({ data: { recipeId: id } }),
  });
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const mut = useMutation({
    mutationFn: () => addFn({ data: { recipeId: id, rating, review: text || undefined } }),
    onSuccess: () => {
      toast.success("Review terkirim");
      setText("");
      qc.invalidateQueries({ queryKey: ["reviews", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Reviews" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)}>
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
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
          >
            Kirim Review
          </button>
        </div>
        <div className="space-y-2">
          {(data?.reviews ?? []).map((r) => (
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
      </main>
      <BottomNav />
    </div>
  );
}
