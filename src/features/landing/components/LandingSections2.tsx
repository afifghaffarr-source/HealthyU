import { Star, Check, Minus, Users, TrendingUp } from "lucide-react";
import { BeforeAfter } from "./BeforeAfter";
import { BlurFade } from "@/components/magicui/blur-fade";
import { AuroraText } from "@/components/magicui/aurora-text";
import { TESTIMONIALS, FAQ_ITEMS, COMPARE, AUDIENCES, MEDIA_LOGOS } from "./landingData";

export function Testimonials() {
  return (
    <section id="testimoni" className="bg-black text-white py-24 md:py-32 px-5">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <BlurFade>
          <h2
            className="text-3xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.07]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Cerita nyata, <AuroraText>hasil nyata</AuroraText>
          </h2>
        </BlurFade>
        <BlurFade delay={0.08}>
          <p className="text-white/60 text-lg mt-4">Cerita nyata dari user HealthyU.</p>
        </BlurFade>
      </div>
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4">
        {TESTIMONIALS.map((t, i) => (
          <BlurFade key={t.name} delay={i * 0.1}>
            <figure className="bg-[#1a1a1c] rounded-xl p-8 h-full flex flex-col">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, si) => (
                  <Star key={si} className="size-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <blockquote className="text-base leading-relaxed text-white/90 mb-5 flex-1">
                "{t.quote}"
              </blockquote>
              {t.result && (
                <div className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-glow bg-primary/10 px-3 py-1 rounded-full w-fit">
                  <TrendingUp className="size-3" />
                  {t.result}
                </div>
              )}
              <figcaption className="flex items-center gap-3 text-sm">
                <img
                  src={t.avatar}
                  alt={t.name}
                  loading="lazy"
                  className="size-9 rounded-full object-cover"
                />
                <span>
                  <strong className="text-white block">{t.name}</strong>
                  <span className="text-white/50 text-xs">
                    {t.city}
                    {t.duration && <> · {t.duration}</>}
                  </span>
                </span>
              </figcaption>
            </figure>
          </BlurFade>
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
      <div
        className="glass rounded-2xl border border-white/15 overflow-x-auto"
        // LIGHTHOUSE-002 scrollable-region-focusable (Safari a11y):
        // Mobile Safari requires keyboard focus on horizontally scrollable
        // containers so users can swipe-scroll with keyboard. tabIndex=0
        // makes the region focusable while preserving wheel/touch scroll.
        tabIndex={0}
        role="region"
        aria-label="Perbandingan fitur HealthyU dengan aplikasi lain"
      >
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
                      <Minus className="size-4 text-muted-foreground" />
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
