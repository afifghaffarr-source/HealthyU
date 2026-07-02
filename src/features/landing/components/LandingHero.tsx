import { Link } from "@tanstack/react-router";
import { ArrowRight, Flame, Shield, Star } from "lucide-react";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BlurFade } from "@/components/magicui/blur-fade";

// Pre-computed particle positions (stable across renders)
const PARTICLES = Array.from({ length: 25 }, (_, i) => ({
  id: i,
  size: i % 2 === 0 ? "w-1 h-1" : "w-0.5 h-0.5",
  opacity: 0.1 + ((i * 7) % 20) / 100,
  top: (i * 13) % 100,
  left: (i * 17) % 100,
  delay: (i * 0.4) % 10,
  duration: 15 + ((i * 3) % 10),
}));

export function LandingHero({
  ctaPrimary,
  ctaPrimaryLabel,
  onCtaClick,
}: {
  ctaPrimary: string;
  ctaPrimaryLabel: string;
  onCtaClick: () => void;
}) {
  return (
    <section className="bg-black text-white min-h-[88vh] flex items-center justify-center px-5 py-20 md:py-28 relative overflow-hidden">
      {/* Particle background - CSS-only floating dots */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className={`absolute rounded-full bg-white ${p.size}`}
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              opacity: p.opacity,
              animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Subtle accent glow */}
      <div
        aria-hidden
        className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl pointer-events-none animate-blob"
      />

      {/* Asymmetric split grid: text left, mockup right */}
      <div className="relative z-10 w-full max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        {/* Left column: Hero content */}
        <div className="space-y-6 text-center md:text-left">
          <BlurFade duration={0.5}>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/80">
              <span className="size-1.5 rounded-full bg-primary-glow animate-pulse" />
              Ditenagai Gemini AI · Gratis selamanya
            </div>
          </BlurFade>

          <BlurFade delay={0.08} duration={0.5}>
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-[-0.03em] leading-[1.07]"
              style={{
                fontFamily: "var(--font-display)",
                textShadow:
                  "1px 1px 2px rgba(0,0,0,0.3), 2px 2px 4px rgba(0,0,0,0.2), 3px 3px 6px rgba(0,0,0,0.1), 4px 4px 8px rgba(0,0,0,0.05)",
              }}
            >
              Hidup sehat,
              <br />
              <AuroraText>AI-nya.</AuroraText>
            </h1>
          </BlurFade>

          <BlurFade delay={0.16} duration={0.5}>
            <p className="text-xl md:text-2xl text-white/80 leading-relaxed max-w-xl md:max-w-none">
              Scan piring, atur puasa, jadwal sholat. Tanya AI coach kapan saja.
            </p>
          </BlurFade>

          <BlurFade delay={0.24} duration={0.5}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start pt-2">
              <Link
                to={ctaPrimary}
                onClick={onCtaClick}
                preload="render"
                className="group relative overflow-hidden bg-primary text-primary-foreground font-medium text-base px-8 py-4 rounded-lg hover:bg-primary-dark hover:-translate-y-0.5 transition-all inline-flex items-center gap-2 justify-center"
              >
                {ctaPrimaryLabel}
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#fitur"
                className="text-base font-medium text-white px-8 py-4 rounded-full border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all inline-flex items-center justify-center"
              >
                Lihat fitur
              </a>
            </div>
          </BlurFade>

          <BlurFade delay={0.32} duration={0.5}>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 pt-6 text-base text-white/70">
              <div className="flex items-center gap-1.5">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <strong className="text-white">4.8</strong> / 5 · 10.000+ user
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="size-3.5 text-primary-glow" /> Data terenkripsi
              </div>
            </div>
          </BlurFade>
        </div>

        {/* Right column: Phone mockup */}
        <BlurFade delay={0.4} duration={0.6} className="hidden md:block">
          <HeroPhoneMockup />
        </BlurFade>
      </div>

      {/* Floating badges - repositioned for split layout */}
      <div
        aria-hidden
        className="hidden lg:block absolute left-[5%] top-[35%] pointer-events-none z-20 animate-float"
        style={{ animationDelay: "0s" }}
      >
        <div
          className="rounded-2xl bg-white/[0.08] border border-white/30 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.1)] flex items-center gap-2"
          style={{ backdropFilter: "blur(24px) saturate(180%)" }}
        >
          <Flame className="size-4 text-amber-400" />
          <span>12 hari streak</span>
        </div>
      </div>

      <div
        aria-hidden
        className="hidden lg:block absolute right-[8%] top-[25%] pointer-events-none z-20 animate-float"
        style={{ animationDelay: "0.4s" }}
      >
        <div
          className="rounded-2xl bg-white/[0.08] border border-white/30 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.1)] flex items-center gap-2"
          style={{ backdropFilter: "blur(24px) saturate(180%)" }}
        >
          <Star className="size-4 text-amber-400 fill-amber-400" />
          <span>Level 8</span>
        </div>
      </div>

      <div
        aria-hidden
        className="hidden lg:block absolute right-[6%] top-[65%] pointer-events-none z-20 animate-float"
        style={{ animationDelay: "0.8s" }}
      >
        <div
          className="rounded-2xl bg-white/[0.08] border border-white/30 px-4 py-2.5 text-sm font-medium text-white shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_0_rgba(255,255,255,0.1)]"
          style={{ backdropFilter: "blur(24px) saturate(180%)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-primary-glow">✓</span>
            <span className="text-xs text-white/80">Target harian</span>
          </div>
          <div className="text-base font-semibold">1,420 / 2,100 kal</div>
          <div className="mt-1.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary-glow rounded-full" style={{ width: "68%" }} />
          </div>
        </div>
      </div>
    </section>
  );
}

// Hero phone mockup - inline CSS dashboard
function HeroPhoneMockup() {
  return (
    <div className="w-full max-w-[320px] mx-auto aspect-[9/19] rounded-[2.5rem] border-[3px] border-white/20 bg-gradient-to-b from-[#1a1a1c] to-black p-5 shadow-2xl flex flex-col gap-4 overflow-hidden animate-float">
      {/* Header */}
      <div className="flex items-center justify-between text-white">
        <span className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Hari ini
        </span>
        <span className="text-xs text-white/50">14 Feb</span>
      </div>

      {/* Circular progress ring */}
      <div className="flex flex-col items-center gap-2 pt-3">
        <div
          className="size-28 rounded-full grid place-items-center relative"
          style={{
            background:
              "conic-gradient(var(--primary) 0deg 244deg, rgba(255,255,255,0.08) 244deg 360deg)",
          }}
        >
          <div className="absolute inset-2 rounded-full bg-[#1a1a1c] grid place-items-center text-center">
            <div>
              <p className="text-lg font-semibold text-white leading-none">1,420</p>
              <p className="text-xs text-white/50 mt-1">/ 2,100 kal</p>
            </div>
          </div>
        </div>
        <span className="text-xs text-primary-glow font-medium">68% goal harian</span>
      </div>

      {/* Meal items */}
      <div className="flex flex-col gap-2 mt-2">
        {[
          { e: "🌅", l: "Sarapan", v: "320 kal" },
          { e: "🍽️", l: "Makan siang", v: "680 kal" },
          { e: "🍎", l: "Snack", v: "190 kal" },
        ].map((m) => (
          <div key={m.l} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2">
            <span className="text-lg leading-none">{m.e}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white leading-none">{m.l}</p>
              <p className="text-xs text-white/50 mt-1">{m.v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Streak badge */}
      <div className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
        <Flame className="size-4 text-amber-400" />
        <span className="text-sm font-medium text-amber-300">Streak 12 hari</span>
      </div>
    </div>
  );
}
