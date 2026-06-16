import { createFileRoute } from "@tanstack/react-router";
import { toast } from "@/lib/toast-config";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useState } from "react";
import { Heart, Share2, Plus, Minus, ChefHat, ListChecks, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/meal-detail/$id")({
  component: MealDetailPage,
});

function MealDetailPage() {
  const { id } = Route.useParams();
  const [servings, setServings] = useState(1);
  const [fav, setFav] = useState(false);
  const ingredients = [
    { name: "Dada ayam", qty: 150, unit: "g" },
    { name: "Nasi merah", qty: 100, unit: "g" },
    { name: "Brokoli", qty: 80, unit: "g" },
    { name: "Minyak zaitun", qty: 1, unit: "sdm" },
  ];
  const steps = [
    "Panaskan wajan dengan minyak zaitun.",
    "Tumis ayam hingga matang merata.",
    "Tambahkan brokoli, masak 3 menit.",
    "Sajikan dengan nasi merah hangat.",
  ];
  const alternatives = [
    { name: "Salmon panggang", kcal: 380 },
    { name: "Tahu kukus", kcal: 220 },
    { name: "Telur dadar sayur", kcal: 260 },
  ];
  const macros = [
    { label: "Kkal", value: Math.round(420 * servings) },
    { label: "Protein", value: `${Math.round(28 * servings)}g` },
    { label: "Karbo", value: `${Math.round(45 * servings)}g` },
  ];

  return (
    <div className="min-h-dvh pb-28 px-4 bg-background">
      <TopAppBar title="Detail Menu" showBack />
      <div className="mt-4 aspect-video rounded-2xl bg-gradient-to-br from-primary/30 to-accent/20 flex items-center justify-center text-muted-foreground relative overflow-hidden">
        <ChefHat className="size-12 opacity-40" />
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={() => setFav((f) => !f)}
            className="size-9 rounded-full bg-card/90 grid place-items-center shadow-sm"
          >
            <Heart className={`size-4 ${fav ? "fill-error text-error" : ""}`} />
          </button>
          <button
            onClick={() => toast.success("Link disalin")}
            className="size-9 rounded-full bg-card/90 grid place-items-center shadow-sm"
          >
            <Share2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Menu #{id}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">~20 menit • Mudah</p>
        </div>
        <div className="flex items-center gap-1 bg-card border rounded-full p-1">
          <button
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            className="size-7 rounded-full grid place-items-center hover:bg-muted"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="text-sm font-semibold w-6 text-center">{servings}</span>
          <button
            onClick={() => setServings((s) => Math.min(9, s + 1))}
            className="size-7 rounded-full grid place-items-center hover:bg-muted"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {macros.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl bg-card p-3 border border-border/40 text-center"
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-bold text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <ListChecks className="size-3.5" /> Bahan ({servings}x)
        </h3>
        <ul className="rounded-2xl bg-card border divide-y">
          {ingredients.map((i) => (
            <li key={i.name} className="flex justify-between px-4 py-2.5 text-sm">
              <span>{i.name}</span>
              <span className="text-muted-foreground">
                {i.qty * servings} {i.unit}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Cara Masak
        </h3>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-2xl bg-card border p-3 text-sm">
              <span className="size-6 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Sparkles className="size-3.5" /> Alternatif
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          {alternatives.map((a) => (
            <div key={a.name} className="shrink-0 w-36 rounded-2xl bg-card border p-3">
              <p className="text-sm font-semibold">{a.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{a.kcal} kkal</p>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={() => toast.success(`Ditambahkan ${servings} porsi ke diary`)}
        className="mt-6 w-full rounded-2xl bg-primary text-primary-foreground py-3 font-semibold shadow-sm active:scale-[0.98] transition"
      >
        Tambah ke Diary
      </button>
      <BottomNav />
    </div>
  );
}
