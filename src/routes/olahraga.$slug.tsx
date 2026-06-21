import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { canonical, hreflangAlternates } from "@/lib/seo";
import { getExercise } from "@/features/content/lib/seoContent.functions";

export const Route = createFileRoute("/olahraga/$slug")({
  loader: async ({ params }) => {
    const ex = await getExercise({ data: { slug: params.slug } });
    if (!ex) throw notFound();
    return ex;
  },
  head: ({ loaderData, params }) => {
    const e = loaderData;
    const title = e
      ? `${e.name} — MET ${e.met}, Kalori Terbakar | HealthyU`
      : "Olahraga | HealthyU";
    const desc = e
      ? `${e.name}: nilai MET ${e.met}. ${e.description ?? ""} Hitung kalori terbakar berdasarkan berat & durasi.`
      : "Database olahraga.";
    const url = canonical(`/olahraga/${params.slug}`);
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
      ],
      links: [{ rel: "canonical", href: url }, ...hreflangAlternates(`/olahraga/${params.slug}`)],
      scripts: e
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ExercisePlan",
                name: e.name,
                description: e.description ?? undefined,
                exerciseType: e.category ?? undefined,
                additionalProperty: { "@type": "PropertyValue", name: "MET", value: e.met },
              }),
            },
          ]
        : [],
    };
  },
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p role="alert" className="text-destructive">
        Gagal memuat: {error.message}
      </p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Olahraga tidak ditemukan</h1>
      <Link to="/olahraga" className="mt-4 inline-block text-primary hover:underline">
        Lihat semua
      </Link>
    </main>
  ),
  component: ExerciseDetail,
});

function ExerciseDetail() {
  const e = Route.useLoaderData();
  const [weight, setWeight] = useState(60);
  const [minutes, setMinutes] = useState(30);
  const kcal = Math.round(((e.met * 3.5 * weight) / 200) * minutes);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link to="/olahraga" className="hover:text-foreground">
          Olahraga
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{e.name}</span>
      </nav>
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{e.name}</h1>
        <p className="mt-2 text-muted-foreground">
          MET {e.met} · {e.category} · {e.difficulty}
        </p>
      </header>
      {e.description && <p className="mb-6 text-muted-foreground">{e.description}</p>}

      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Hitung kalori terbakar</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="block mb-1 text-muted-foreground">Berat badan (kg)</span>
            <input
              type="number"
              value={weight}
              onChange={(ev) => setWeight(Number(ev.target.value) || 0)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1 text-muted-foreground">Durasi (menit)</span>
            <input
              type="number"
              value={minutes}
              onChange={(ev) => setMinutes(Number(ev.target.value) || 0)}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-4 rounded-lg bg-primary/5 p-4">
          <div className="text-xs uppercase text-muted-foreground">Estimasi</div>
          <div className="text-3xl font-bold text-primary">
            {kcal} <span className="text-sm font-normal">kkal</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Rumus: MET × 3,5 × kg ÷ 200 × menit</p>
        </div>
      </section>

      {e.muscle_groups && e.muscle_groups.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Otot yang dilatih</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {e.muscle_groups.map((m: string) => (
              <span key={m} className="rounded-full bg-accent px-3 py-1 text-sm">
                {m}
              </span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
