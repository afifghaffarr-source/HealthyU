import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRecipes } from "@/lib/recipes.functions";
import { generateRecipeFromIngredients, type GeneratedRecipe } from "@/lib/ai-extras.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Clock, Flame, Search, Sparkles, Loader2, X, Star, Bookmark } from "lucide-react";
import { toast } from "sonner";

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
  const genRecipe = useServerFn(generateRecipeFromIngredients);
  const { data: all = [] } = useQuery({ queryKey: ["recipes"], queryFn: () => fetchList() });
  const [cat, setCat] = useState<(typeof CATS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [sortByRating, setSortByRating] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [ingredients, setIngredients] = useState("");
  const [prefs, setPrefs] = useState("");
  const [generated, setGenerated] = useState<GeneratedRecipe | null>(null);

  const genMutation = useMutation({
    mutationFn: () => genRecipe({ data: { ingredients, preferences: prefs || undefined } }),
    onSuccess: (r) => setGenerated(r),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal membuat resep"),
  });
  const items = all
    .filter((r) => cat === "all" || r.category === cat)
    .filter((r) => {
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return r.title.toLowerCase().includes(s) || (r.description ?? "").toLowerCase().includes(s);
    })
    .slice()
    .sort((a, b) =>
      sortByRating
        ? Number(b.avg_rating ?? 0) - Number(a.avg_rating ?? 0)
        : a.title.localeCompare(b.title),
    );

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
          <Link
            to="/recipes/saved"
            className="ml-auto size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center"
            aria-label="Resep tersimpan"
          >
            <Bookmark className="size-4" />
          </Link>
        </header>

        <div className="relative">
          <Search className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari resep (gado-gado, ayam bakar...)"
            className="w-full bg-card rounded-2xl outline-1 outline-black/10 py-3 pl-11 pr-4 text-sm"
          />
        </div>

        <button
          onClick={() => setAiOpen(true)}
          className="w-full bg-gradient-to-r from-primary to-coral text-primary-foreground rounded-2xl p-4 flex items-center gap-3 text-left shadow-md"
        >
          <Sparkles className="size-5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">Buat resep dengan AI</p>
            <p className="text-[11px] opacity-90">Masukkan bahan di kulkasmu</p>
          </div>
        </button>

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
          <button
            onClick={() => setSortByRating((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1 ${
              sortByRating ? "bg-amber-400 text-amber-950" : "bg-card outline-1 outline-black/10"
            }`}
          >
            <Star className="size-3" /> Top rating
          </button>
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
                {Number(r.rating_count ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                    <Star className="size-3 fill-amber-500 text-amber-500" />
                    {Number(r.avg_rating ?? 0).toFixed(1)}
                    <span className="text-muted-foreground font-normal">({r.rating_count})</span>
                  </span>
                )}
              </div>
            </Link>
          ))}
          {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Tidak ada resep</p>}
        </section>
      </div>

      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setAiOpen(false)}>
          <div
            className="w-full max-w-md bg-card rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Sparkles className="size-5 text-primary" /> Resep AI
              </h2>
              <button onClick={() => setAiOpen(false)} className="p-1 rounded-full hover:bg-muted">
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
                  <label className="text-xs font-semibold text-muted-foreground">Preferensi (opsional)</label>
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
                  {genMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
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
                  <span className="inline-flex items-center gap-1"><Clock className="size-3" />{generated.prep_min} min</span>
                  <span>{generated.servings} porsi</span>
                </div>
                <div>
                  <p className="text-xs font-bold mb-2">Bahan</p>
                  <ul className="text-sm space-y-1 list-disc pl-5">
                    {generated.ingredients.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-bold mb-2">Cara membuat</p>
                  <ol className="text-sm space-y-1.5 list-decimal pl-5">
                    {generated.instructions.map((x, i) => <li key={i}>{x}</li>)}
                  </ol>
                </div>
                {generated.tips.length > 0 && (
                  <div className="bg-mint/40 rounded-xl p-3">
                    <p className="text-xs font-bold mb-1">💡 Tips sehat</p>
                    <ul className="text-xs space-y-1 list-disc pl-5">
                      {generated.tips.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                )}
                <button
                  onClick={() => { setGenerated(null); setIngredients(""); setPrefs(""); }}
                  className="w-full bg-muted rounded-xl py-2.5 text-sm font-semibold"
                >
                  Buat resep lain
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function Mini({ label, v }: { label: string; v: string }) {
  return (
    <div className="bg-muted/60 rounded-xl p-2">
      <p className="text-sm font-bold">{v}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}