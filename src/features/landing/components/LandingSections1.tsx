import { Zap, ArrowRight, Heart, Camera, Utensils, MessageCircle } from "lucide-react";
import { StatsCounter } from "./StatsCounter";
import { FEATURES, STEPS, MARQUEE_CITIES } from "./landingData";

export function TrustMarquee() {
  return (
    <section
      aria-label="Kota pengguna"
      className="border-y border-white/10 bg-card/30 py-4 overflow-hidden"
    >
      <div className="flex gap-12 animate-marquee whitespace-nowrap text-sm font-semibold text-muted-foreground">
        {[...Array(2)].map((_, dup) => (
          <div key={dup} className="flex gap-12 shrink-0">
            {MARQUEE_CITIES.map((c) => (
              <span key={c} className="inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" />
                {c}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function StatsStrip() {
  const items = [
    { n: 10000, s: "+", l: "Pengguna aktif", i: Heart },
    { n: 5000, s: "+", l: "Menu Indonesia", i: Utensils },
    { n: 98, s: "%", l: "Akurasi scan AI", i: Camera },
    { n: 24, s: "/7", l: "HealthyU AI Coach siap", i: MessageCircle },
  ];
  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(({ n, s, l, i: Icon }) => (
        <div key={l} className="glass rounded-2xl p-4 border border-white/15 text-center">
          <Icon className="size-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            <StatsCounter value={n} suffix={s} />
          </p>
          <p className="text-xs text-muted-foreground">{l}</p>
        </div>
      ))}
    </section>
  );
}

export function FeaturesBento() {
  return (
    <section id="fitur" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
          <Zap className="size-3" /> Fitur unggulan
        </span>
        <h2
          className="text-3xl md:text-5xl font-bold tracking-tight mt-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Satu app. <span className="text-primary">Semua kebutuhan sehatmu.</span>
        </h2>
        <p className="text-muted-foreground mt-3">
          Dirancang untuk gaya hidup Indonesia: dari nasi padang sampai puasa Ramadhan.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FEATURES.map(({ icon: Icon, title, desc, tint }, i) => (
          <article
            key={title}
            className={`group relative overflow-hidden rounded-2xl p-5 glass border border-white/15 hover:border-primary/30 hover:-translate-y-1 transition-all shadow-sm hover:shadow-xl hover:shadow-primary/10 ${i === 0 ? "sm:col-span-2 sm:row-span-1" : ""}`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-br ${tint} opacity-60 group-hover:opacity-100 transition-opacity`}
            />
            <div className="relative">
              <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary grid place-items-center mb-3 border border-primary/20">
                <Icon className="size-5" />
              </div>
              <h3 className="font-bold text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>
                {title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="cara" className="relative">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-mint/40 to-transparent"
      />
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2
            className="text-3xl md:text-5xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Mulai dalam <span className="text-primary">3 langkah</span>
          </h2>
          <p className="text-muted-foreground mt-3">
            Tidak ribet. Hasil terlihat dalam minggu pertama.
          </p>
        </div>
        <ol className="grid md:grid-cols-3 gap-4 relative">
          {STEPS.map(({ n, title, desc }, i) => (
            <li
              key={n}
              className="relative glass rounded-2xl p-6 border border-white/15 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-baseline gap-3 mb-2">
                <span
                  className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-primary to-accent"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {n}
                </span>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden md:block size-4 text-primary/40 ml-auto" />
                )}
              </div>
              <h3 className="font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                {title}
              </h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
