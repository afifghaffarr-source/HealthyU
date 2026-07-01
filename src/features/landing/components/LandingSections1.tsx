import { Zap, Heart, Camera, Utensils, MessageCircle } from "lucide-react";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { BlurFade } from "@/components/magicui/blur-fade";
import { ShineBorder } from "@/components/magicui/shine-border";
import { AuroraText } from "@/components/magicui/aurora-text";
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
    <section className="max-w-5xl mx-auto px-5 md:px-8 py-20 grid grid-cols-2 md:grid-cols-4 gap-8">
      {items.map(({ n, s, l, i: Icon }, idx) => (
        <BlurFade key={l} delay={idx * 0.08} className="text-center">
          <Icon className="size-6 text-primary mx-auto mb-3" />
          <p
            className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <NumberTicker value={n} suffix={s} />
          </p>
          <p className="text-sm text-muted-foreground mt-1">{l}</p>
        </BlurFade>
      ))}
    </section>
  );
}

export function FeaturesBento() {
  return (
    <section
      id="fitur"
      className="bg-black text-white py-24 md:py-32 px-5 relative overflow-hidden"
    >
      {/* Decorative gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -left-10 w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 -right-10 w-[320px] h-[320px] rounded-full bg-emerald-600/[0.07] blur-3xl"
      />
      <div className="text-center max-w-2xl mx-auto mb-14 relative z-10">
        <BlurFade>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-glow bg-primary/10 px-3 py-1 rounded-full">
            <Zap className="size-3" /> Fitur unggulan
          </span>
        </BlurFade>
        <BlurFade delay={0.08}>
          <h2
            className="text-3xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.07] mt-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Satu app. Semua kebutuhan <AuroraText>sehatmu.</AuroraText>
          </h2>
        </BlurFade>
        <BlurFade delay={0.16}>
          <p className="text-white/60 text-lg mt-4">
            Dirancang untuk gaya hidup Indonesia: dari nasi padang sampai puasa Ramadhan.
          </p>
        </BlurFade>
      </div>
      <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
          <BlurFade
            key={title}
            delay={i * 0.06}
            className={i === 0 ? "sm:col-span-2 lg:col-span-1" : ""}
          >
            <div className="group relative bg-[#1a1a1c] rounded-xl min-h-[240px] flex flex-col justify-end overflow-hidden hover:-translate-y-1 transition-transform duration-300 hover:shadow-[0_0_0_1px_var(--primary-glow),0_12px_40px_rgba(0,0,0,0.4)]">
              <ShineBorder
                shineColor={["var(--primary-glow)", "var(--primary)"]}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
              {i === 0 ? (
                <>
                  {/* 2x2 food photo grid with calorie badges */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {[
                      { src: "/images/recipes/gado-gado-sehat.png", label: "Gado-gado · 320 kal" },
                      {
                        src: "/images/recipes/soto-ayam-rendah-lemak.png",
                        label: "Soto ayam · 280 kal",
                      },
                      {
                        src: "/images/recipes/nasi-goreng-kacang-merah-sehat.png",
                        label: "Nasi goreng · 450 kal",
                      },
                      {
                        src: "/images/recipes/smoothie-mangga-kelapa-sehat.png",
                        label: "Smoothie · 190 kal",
                      },
                    ].map((food) => (
                      <div
                        key={food.src}
                        className="relative aspect-square rounded-lg overflow-hidden bg-white/5"
                      >
                        <img
                          src={food.src}
                          alt={food.label}
                          loading="lazy"
                          className="absolute inset-0 size-full object-cover"
                        />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 truncate">
                          {food.label}
                        </span>
                      </div>
                    ))}
                  </div>
                  <h3
                    className="font-semibold text-lg text-white mb-1.5"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                </>
              ) : (
                <>
                  <div className="size-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 grid place-items-center mb-auto text-primary-glow">
                    <Icon className="size-5" />
                  </div>
                  <h3
                    className="font-semibold text-lg text-white mt-4 mb-1.5"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                </>
              )}
            </div>
          </BlurFade>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="cara" className="bg-[#f5f5f7] py-24 md:py-32 px-5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <BlurFade>
            <h2
              className="text-3xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.07]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Mulai dalam <span className="text-primary">3 langkah</span>
            </h2>
          </BlurFade>
          <BlurFade delay={0.08}>
            <p className="text-muted-foreground text-lg mt-4">
              Tidak ribet. Hasil terlihat dalam minggu pertama.
            </p>
          </BlurFade>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {STEPS.map(({ n, title, desc }, i) => (
            <BlurFade key={n} delay={i * 0.12} className="text-center">
              <div
                className="text-5xl font-light text-primary mb-4"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {n}
              </div>
              <h3
                className="font-semibold text-xl text-foreground mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {title}
              </h3>
              <p className="text-muted-foreground text-base">{desc}</p>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
