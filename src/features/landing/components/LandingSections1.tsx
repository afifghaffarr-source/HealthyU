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
    <section className="relative max-w-5xl mx-auto px-5 md:px-8 py-24 grid grid-cols-2 md:grid-cols-4 gap-8 overflow-hidden">
      {/* Decorative gradient mesh backgrounds */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.08),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 w-[350px] h-[350px] bg-[radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.06),transparent_70%)]"
      />

      {items.map(({ n, s, l, i: Icon }, idx) => (
        <BlurFade key={l} delay={idx * 0.08} className="text-center relative z-10">
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
        {FEATURES.map(({ icon: Icon, title, desc, foodImage }, i) => (
          <BlurFade
            key={title}
            delay={i * 0.06}
            className={i === 0 ? "sm:col-span-2 lg:col-span-1" : ""}
          >
            <div className="group relative bg-gradient-to-br from-[#1a1a1c] via-[#1a1a1c] to-primary/[0.03] rounded-xl min-h-[240px] flex flex-col justify-end overflow-hidden hover:-translate-y-1 transition-transform duration-300 hover:shadow-[0_0_0_1px_var(--primary-glow),0_12px_40px_rgba(0,0,0,0.4)]">
              {/* Subtle gradient mesh overlay */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 right-0 w-[200px] h-[200px] bg-[radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.08),transparent_70%)] opacity-60"
              />

              <ShineBorder
                shineColor={["var(--primary-glow)", "var(--primary)"]}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              />
              {i === 0 ? (
                <>
                  {/* 2x2 food photo grid with calorie badges */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3 relative z-10">
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
                    className="font-semibold text-lg text-white mb-1.5 relative z-10"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed relative z-10">{desc}</p>
                </>
              ) : (
                <>
                  {foodImage && (
                    <div className="absolute top-3 right-3 w-20 h-20 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] z-10">
                      <img
                        src={foodImage}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </div>
                  )}
                  <div className="size-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 grid place-items-center mb-auto text-primary-glow relative z-10">
                    <Icon className="size-5" />
                  </div>
                  <h3
                    className="font-semibold text-lg text-white mt-4 mb-1.5 relative z-10"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed relative z-10">{desc}</p>
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
  const stepMockups = [
    {
      gradient: "from-emerald-500/20 to-teal-500/10",
      elements: (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50" />
          <div className="relative z-10 p-3 space-y-2">
            <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
              <div className="size-8 rounded-full bg-gradient-to-br from-primary to-primary-glow" />
              <div className="flex-1 space-y-1">
                <div className="h-2 bg-gray-200 rounded w-20" />
                <div className="h-1.5 bg-gray-100 rounded w-16" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-2 shadow-sm space-y-1.5">
              <div className="h-2 bg-gray-200 rounded w-24" />
              <div className="h-1.5 bg-gray-100 rounded w-full" />
              <div className="h-1.5 bg-gray-100 rounded w-3/4" />
            </div>
          </div>
        </>
      ),
    },
    {
      gradient: "from-primary/20 to-accent/10",
      elements: (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-white" />
          <div className="relative z-10 p-3 space-y-2">
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="h-2 bg-gray-200 rounded w-16" />
                <div className="h-2 bg-primary/30 rounded w-12" />
              </div>
              <div className="space-y-1.5">
                {[60, 80, 40].map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-primary" />
                    <div className="h-1.5 bg-gray-100 rounded" style={{ width: `${w}%` }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary to-primary-glow rounded-lg p-2 text-center">
              <div className="h-2 bg-white/30 rounded w-20 mx-auto" />
            </div>
          </div>
        </>
      ),
    },
    {
      gradient: "from-amber-500/20 to-orange-500/10",
      elements: (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-amber-50/30" />
          <div className="relative z-10 p-3 space-y-2">
            <div className="bg-white rounded-lg p-2 shadow-sm">
              <div className="flex items-center justify-center mb-2">
                <div
                  className="size-12 rounded-full grid place-items-center relative"
                  style={{
                    background:
                      "conic-gradient(var(--primary) 0deg 270deg, rgba(0,0,0,0.05) 270deg 360deg)",
                  }}
                >
                  <div className="absolute inset-1 rounded-full bg-white grid place-items-center">
                    <div className="size-2 rounded-full bg-primary" />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 bg-gray-200 rounded w-full" />
                <div className="h-1.5 bg-gray-100 rounded w-3/4 mx-auto" />
              </div>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex-1 h-8 bg-white rounded shadow-sm" />
              ))}
            </div>
          </div>
        </>
      ),
    },
  ];

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
              {/* CSS Phone Mockup */}
              <div className="mb-6 flex justify-center">
                <div
                  className="w-[140px] aspect-[9/19] rounded-[1.5rem] border-2 border-gray-300 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] overflow-hidden relative"
                  aria-hidden="true"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${stepMockups[i].gradient}`}
                  />
                  {stepMockups[i].elements}
                </div>
              </div>
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
