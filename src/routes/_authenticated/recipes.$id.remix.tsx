import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { remixRecipe } from "@/features/scan/lib/scanSocial.functions";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recipes/$id/remix")({
  component: Page,
});

function Page() {
  const { id } = useParams({ from: "/_authenticated/recipes/$id/remix" });
  const fn = useServerFn(remixRecipe);
  const [sub, setSub] = useState("");
  const mut = useMutation({
    mutationFn: () => fn({ data: { recipeId: id, substitute: sub } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const r = mut.data?.remix;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Recipe Remix AI" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <label className="text-sm font-medium inline-flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Substitusi/Permintaan
          </label>
          <input
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            placeholder="Ganti daging dengan tempe; rendah garam…"
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !sub.trim()}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2 text-sm font-medium"
          >
            {mut.isPending ? <Loader2 className="size-4 animate-spin inline" /> : "Remix"}
          </button>
        </div>
        {r && (
          <div className="rounded-2xl bg-card border p-4 space-y-3">
            <h2 className="font-bold">{r.title}</h2>
            <div className="text-xs text-muted-foreground">
              {r.calories} kkal · P{r.protein_g}g · K{r.carbs_g}g · L{r.fat_g}g
            </div>
            <div>
              <div className="text-sm font-semibold mb-1">Bahan</div>
              <ul className="list-disc pl-4 text-sm space-y-0.5">
                {(r.ingredients ?? []).map((x: string, i: number) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-sm font-semibold mb-1">Langkah</div>
              <ol className="list-decimal pl-4 text-sm space-y-0.5">
                {(r.instructions ?? []).map((x: string, i: number) => (
                  <li key={i}>{x}</li>
                ))}
              </ol>
            </div>
            {r.notes && <p className="text-xs text-muted-foreground italic">{r.notes}</p>}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
