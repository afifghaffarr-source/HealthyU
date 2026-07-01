import { Sparkles, Timer, Flame } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { RECIPES } from "./landingData";

export function HeroDemoCard() {
  return (
    <div
      className="relative aspect-[4/5] max-w-sm mx-auto rounded-[2.5rem] p-6 shadow-2xl shadow-primary/20 hover-tilt overflow-hidden border border-white/20"
      style={{
        background:
          "linear-gradient(140deg, color-mix(in oklab, var(--mint) 60%, transparent), color-mix(in oklab, var(--card) 90%, transparent) 50%, color-mix(in oklab, var(--accent) 25%, transparent))",
      }}
    >
      <div className="pointer-events-none absolute -inset-1 rounded-[2.5rem] bg-gradient-to-br from-primary/30 via-transparent to-accent/30 blur-xl -z-10" />
      <div className="space-y-3 h-full flex flex-col">
        <div className="glass rounded-2xl p-4 border border-white/20">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-medium">Hari ini</p>
            <span className="text-[10px] font-bold text-primary bg-primary/15 px-2 py-0.5 rounded-full">
              78%
            </span>
          </div>
          <p className="text-2xl font-bold mt-1" style={{ fontFamily: "var(--font-display)" }}>
            1.420 <span className="text-sm text-muted-foreground font-normal">/ 1.800 kkal</span>
          </p>
          <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary via-primary-glow to-accent rounded-full animate-fill-progress"
              style={{ width: "78%" }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Sisa ~380 kkal</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: "Protein", v: "85g", c: "bg-primary" },
            { k: "Karbo", v: "150g", c: "bg-accent" },
            { k: "Lemak", v: "45g", c: "bg-amber-500" },
          ].map(({ k, v, c }) => (
            <div key={k} className="glass rounded-xl p-2.5 text-center border border-white/15">
              <div className={`size-1.5 ${c} rounded-full mx-auto mb-1`} />
              <p className="text-[9px] text-muted-foreground font-medium">{k}</p>
              <p className="text-sm font-bold">{v}</p>
            </div>
          ))}
        </div>
        <div className="glass rounded-2xl p-4 border border-primary/20 flex-1 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative inline-flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Sparkles className="size-3" />
            </span>
            <p className="text-sm font-bold">HealthyU AI Coach</p>
            <span className="ml-auto text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
              AI
            </span>
          </div>
          <p className="text-xs text-foreground/85 leading-relaxed">
            Hampir sampai target! Tambah <strong>ayam panggang 100g</strong> sore ini biar protein
            full. 💪
          </p>
        </div>
        <div className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground rounded-2xl p-3 flex items-center justify-between">
          <span className="text-xs font-bold inline-flex items-center gap-1.5">
            🔥 Streak 12 hari
          </span>
          <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
            Level 4
          </span>
        </div>
      </div>
    </div>
  );
}

export function PopularRecipes({ ctaHref }: { ctaHref: string }) {
  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-16">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2
            className="text-3xl md:text-4xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Resep populer minggu ini
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Diuji dapur lokal, ramah kalori.</p>
        </div>
        <Link to={ctaHref} className="hidden sm:inline text-sm font-semibold text-primary">
          Lihat semua →
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {RECIPES.map((r, i) => (
          <article
            key={r.name}
            className="glass rounded-2xl border border-white/15 overflow-hidden hover:-translate-y-1 transition-all"
          >
            <div
              className="aspect-[4/3]"
              style={{
                background: `linear-gradient(135deg, hsl(${i * 70} 70% 70%), hsl(${i * 70 + 40} 70% 55%))`,
              }}
            />
            <div className="p-4">
              <h3 className="font-bold text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>
                {r.name}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Flame className="size-3 text-amber-500" />
                  {r.kcal} kkal
                </span>
                <span className="inline-flex items-center gap-1">
                  <Timer className="size-3" />
                  {r.time}
                </span>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
