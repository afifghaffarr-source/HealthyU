import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRecipe } from "@/lib/recipes.functions";
import { BottomNav } from "@/components/bottom-nav";
import { ArrowLeft, Clock, Flame, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/recipes/$id")({
  component: RecipeDetail,
});

function RecipeDetail() {
  const { id } = Route.useParams();
  const fetch = useServerFn(getRecipe);
  const { data: r, isLoading } = useQuery({ queryKey: ["recipe", id], queryFn: () => fetch({ data: { id } }) });

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link to="/recipes" className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-xl font-bold flex-1 truncate">{r?.title ?? "Resep"}</h1>
        </header>

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
                    <span className="size-6 shrink-0 bg-primary text-primary-foreground rounded-full grid place-items-center text-xs font-bold">{i + 1}</span>
                    <span className="pt-0.5">{it}</span>
                  </li>
                ))}
              </ol>
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