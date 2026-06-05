import { Star, Check, Users } from "lucide-react";
import { BeforeAfter } from "./BeforeAfter";
import { TESTIMONIALS, FAQ_ITEMS, COMPARE, AUDIENCES, MEDIA_LOGOS } from "./landingData";

export function Testimonials() {
  return (
    <section id="testimoni" className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2
          className="text-3xl md:text-5xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Cerita nyata, <span className="text-primary">hasil nyata</span>
        </h2>
        <p className="text-muted-foreground mt-3">Cerita nyata dari user HealthyU.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {TESTIMONIALS.map((t) => (
          <figure
            key={t.name}
            className="glass rounded-2xl p-6 border border-white/15 hover:border-primary/30 hover:-translate-y-1 transition-all"
          >
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <blockquote className="text-sm leading-relaxed mb-4">"{t.quote}"</blockquote>
            <figcaption className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-8 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground text-xs font-bold">
                {t.name[0]}
              </span>
              <span>
                <strong className="text-foreground block">{t.name}</strong>
                {t.city}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section id="faq" className="relative">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-mint/40 to-transparent"
      />
      <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <h2
          className="text-3xl md:text-5xl font-bold tracking-tight text-center mb-10"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Pertanyaan umum
        </h2>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.q}
              className="glass rounded-2xl p-5 border border-white/15 group hover:border-primary/30 transition-colors"
            >
              <summary className="font-bold cursor-pointer flex items-center justify-between text-sm">
                {item.q}
                <span className="text-primary group-open:rotate-45 transition-transform text-xl leading-none">
                  +
                </span>
              </summary>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ComparisonTable() {
  return (
    <section className="max-w-5xl mx-auto px-5 md:px-8 py-16">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2
          className="text-3xl md:text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          HealthyU vs <span className="text-muted-foreground">yang lain</span>
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Kenapa ribuan orang Indonesia pindah ke HealthyU.
        </p>
      </div>
      <div className="glass rounded-2xl border border-white/15 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-card/60">
            <tr className="text-left">
              <th className="p-4 font-semibold">Fitur</th>
              <th className="p-4 font-semibold text-primary">HealthyU</th>
              <th className="p-4 font-semibold text-muted-foreground">MyFitnessPal</th>
              <th className="p-4 font-semibold text-muted-foreground">Fitbit</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE.map((r) => (
              <tr key={r.f} className="border-t border-white/10">
                <td className="p-4 font-medium">{r.f}</td>
                {[r.us, r.mfp, r.fitbit].map((v, i) => (
                  <td key={i} className="p-4">
                    {v === true ? (
                      <Check className="size-4 text-primary" />
                    ) : v === false ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{v}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ForWhom() {
  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-16">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2
          className="text-3xl md:text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Dibuat untuk <span className="text-primary">semua orang</span>
        </h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {AUDIENCES.map(({ icon: Icon, t, d }) => (
          <div
            key={t}
            className="glass rounded-2xl p-5 border border-white/15 hover:border-primary/30 hover:-translate-y-1 transition-all"
          >
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 grid place-items-center mb-3 text-primary">
              <Icon className="size-5" />
            </div>
            <h3 className="font-bold text-sm mb-1" style={{ fontFamily: "var(--font-display)" }}>
              {t}
            </h3>
            <p className="text-xs text-muted-foreground">{d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BeforeAfterSection() {
  return (
    <section className="max-w-4xl mx-auto px-5 md:px-8 py-16">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2
          className="text-3xl md:text-4xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Hasil nyata, <span className="text-primary">geser & lihat</span>
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Transformasi user HealthyU dalam 12 minggu.
        </p>
      </div>
      <BeforeAfter />
    </section>
  );
}

export function FeaturedIn() {
  return (
    <section className="max-w-5xl mx-auto px-5 md:px-8 py-10">
      <p className="text-center text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-4 inline-flex items-center gap-2 justify-center w-full">
        <Users className="size-3.5" /> Featured in
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-70">
        {MEDIA_LOGOS.map((m) => (
          <span
            key={m}
            className="font-bold tracking-tight text-muted-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {m}
          </span>
        ))}
      </div>
    </section>
  );
}