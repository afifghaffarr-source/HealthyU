import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRecipes } from "@/lib/recipes.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Clock, Flame } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recipes")({
  component: RecipesPage,
});

const CATS = [
  { id: "all", label: "Semua" },
  { id: "breakfast", label: "Sarapan" },
  { id: "main", label: "Utama" },
  { id: "dinner", label: "Malam" },
  { id: "snack", label: "Snack" },
] as const;

function RecipesPage() {
  const fetchList = useServerFn(listRecipes);
  const { data: all = [] } = useQuery({ queryKey: ["recipes"], queryFn: () => fetchList() });
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("all");
  const items = cat === "all" ? all : all.filter((r) => r.category === cat);

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/profile" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Resep Sehat</h1>
            <p className="text-xs text-muted-foreground">Pilihan menu Indonesia</p>
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1">
          {CATS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                cat === c.id ? "bg-primary text-primary-foreground" : "bg-card outline-1 outline-black/10"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <section className="space-y-3">
          {items.map((r) => (
            <Link
              key={r.id}
              to="/recipes/$id"
              params={{ id: r.id }}
              className="block bg-card p-4 rounded-2xl outline-1 outline-black/5"
            >
              <h3 className="font-bold">{r.title}</h3>
              {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Flame className="size-3" />{r.calories} kcal</span>
                <span className="inline-flex items-center gap-1"><Clock className="size-3" />{r.prep_min} min</span>
                <span>P{Math.round(Number(r.protein_g))} K{Math.round(Number(r.carbs_g))} L{Math.round(Number(r.fat_g))}</span>
              </div>
            </Link>
          ))}
          {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Tidak ada resep</p>}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}