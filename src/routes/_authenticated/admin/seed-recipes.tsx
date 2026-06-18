import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { seedRecipesAdmin } from "@/features/admin/lib/seedRecipesAdmin.functions";
import { supabase } from "@/integrations/supabase/client";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Sparkles, Loader2, CheckCircle2, XCircle, SkipForward } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/seed-recipes")({
  beforeLoad: async () => {
    // Defense in depth: redirect non-admins before any rendering.
    // The server function also enforces this via has_role RPC.
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw redirect({ to: "/" });
  },
  component: SeedRecipesPage,
});

type SeedResult = Awaited<ReturnType<typeof seedRecipesAdmin>>;

function SeedRecipesPage() {
  const seed = useServerFn(seedRecipesAdmin);
  const [count, setCount] = useState(5);
  const [category, setCategory] = useState("");
  const [focus, setFocus] = useState("");
  const [dryRun, setDryRun] = useState(true);

  const [result, setResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      seed({
        data: {
          count,
          category: category.trim() || undefined,
          focus: focus.trim() || undefined,
          dryRun,
          imageTemplate: "/images/recipes/{slug}.jpg",
        },
      }),
    onSuccess: (r) => {
      setResult(r);
      setError(null);
    },
    onError: (e) => setError((e as Error).message),
  });

  return (
    <main className="min-h-dvh bg-background pb-20">
      <TopAppBar title="Seed Recipes (Admin)" showBack />
      <div className="max-w-2xl mx-auto px-5 pt-4 space-y-5">
        <section className="bg-card rounded-3xl p-5 outline-1 outline-black/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-4 text-primary" />
            <h2 className="font-bold">Bulk Recipe Generator</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Generate Indonesian healthy recipes via VexoAPI and insert into recipes + seo_recipes
            tables. Idempotent: skips recipes whose slug already exists.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setResult(null);
              setError(null);
              mut.mutate();
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Count (1-20)</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="mt-1 w-full bg-muted rounded-xl px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Category (optional)
                </label>
                <input
                  type="text"
                  placeholder="snack / breakfast / main"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full bg-muted rounded-xl px-3 py-2 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Nutritional focus (optional)
              </label>
              <input
                type="text"
                placeholder="high protein / low carb / vegan"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="mt-1 w-full bg-muted rounded-xl px-3 py-2 outline-none"
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="size-4"
              />
              <span>Dry run (preview only, no DB writes)</span>
            </label>

            <button
              type="submit"
              disabled={mut.isPending}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mut.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {dryRun ? "Preview" : "Generate & Insert"}
                </>
              )}
            </button>
          </form>
        </section>

        {error && (
          <section className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4">
            <p className="text-sm font-semibold text-destructive mb-1">Error</p>
            <p className="text-sm text-destructive/90 font-mono">{error}</p>
          </section>
        )}

        {result && (
          <section className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Stat
                icon={<CheckCircle2 className="size-4" />}
                label={dryRun ? "Would insert" : "Inserted"}
                value={result.inserted.length}
                tone="success"
              />
              <Stat
                icon={<SkipForward className="size-4" />}
                label="Skipped"
                value={result.skipped.length}
                tone="muted"
              />
              <Stat
                icon={<XCircle className="size-4" />}
                label="Failed"
                value={result.failed.length}
                tone={result.failed.length > 0 ? "danger" : "muted"}
              />
            </div>

            {result.inserted.length > 0 && (
              <ResultGroup
                title={dryRun ? "Would insert" : "Inserted"}
                tone="success"
                items={result.inserted.map((r) => ({
                  label: r.title,
                  meta: r.slug,
                }))}
              />
            )}
            {result.skipped.length > 0 && (
              <ResultGroup
                title="Skipped"
                tone="muted"
                items={result.skipped.map((s) => ({
                  label: s.title,
                  meta: s.reason,
                }))}
              />
            )}
            {result.failed.length > 0 && (
              <ResultGroup
                title="Failed"
                tone="danger"
                items={result.failed.map((f) => ({
                  label: f.title,
                  meta: f.error,
                }))}
              />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "success" | "danger" | "muted";
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "danger"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <div className={`rounded-2xl p-3 text-center ${cls}`}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[10px] font-medium">{label}</p>
    </div>
  );
}

function ResultGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: Array<{ label: string; meta: string }>;
  tone: "success" | "muted" | "danger";
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-50/50 outline-emerald-200"
      : tone === "danger"
        ? "bg-destructive/5 outline-destructive/20"
        : "bg-muted/40 outline-black/5";
  return (
    <div className={`rounded-2xl outline-1 ${cls} p-4`}>
      <p className="text-xs font-bold uppercase tracking-wide mb-2">{title}</p>
      <ul className="space-y-1.5 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex flex-col">
            <span className="font-medium">{it.label}</span>
            <span className="text-xs text-muted-foreground font-mono break-all">{it.meta}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
