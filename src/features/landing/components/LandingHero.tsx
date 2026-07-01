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
    <section className="bg-black text-white min-h-[88vh] flex items-center justify-center text-center px-5 py-20 md:py-28 relative overflow-hidden">
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

      {/* Floating badges - scattered around hero text with enhanced glass morphism */}
      <div
        aria-hidden
        className="hidden lg:block absolute left-[8%] top-[28%] pointer-events-none z-20 animate-float"
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
        className="hidden lg:block absolute left-[6%] top-[58%] pointer-events-none z-20 animate-float"
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

      <div
        aria-hidden
        className="hidden lg:block absolute left-[10%] top-[75%] pointer-events-none z-20 animate-float"
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

      <div className="relative z-10 max-w-3xl mx-auto space-y-6">
        <BlurFade duration={0.5}>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/80">
            <span className="size-1.5 rounded-full bg-primary-glow animate-pulse" />
            Ditenagai Gemini AI · Gratis selamanya
          </div>
        </BlurFade>

        <BlurFade delay={0.08} duration={0.5}>
          <h1
            className="text-5xl md:text-7xl font-semibold tracking-[-0.03em] leading-[1.07]"
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
          <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto leading-relaxed">
            Scan piring, atur puasa, jadwal sholat. Tanya AI coach kapan saja.
          </p>
        </BlurFade>

        <BlurFade delay={0.24} duration={0.5}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              to={ctaPrimary}
              onClick={onCtaClick}
              preload="render"
              className="group relative overflow-hidden bg-primary text-primary-foreground font-medium text-base px-7 py-3.5 rounded-lg hover:bg-primary-dark hover:-translate-y-0.5 transition-all inline-flex items-center gap-2 justify-center"
            >
              {ctaPrimaryLabel}
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#fitur"
              className="text-base font-medium text-white px-7 py-3.5 rounded-full border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all inline-flex items-center justify-center"
            >
              Lihat fitur
            </a>
          </div>
        </BlurFade>

        <BlurFade delay={0.32} duration={0.5}>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-6 text-sm text-white/60">
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

      {/* CSS phone mockup with mini dashboard */}
      <div
        aria-hidden
        className="hidden lg:block absolute right-[6%] top-1/2 -translate-y-1/2 z-10 animate-float pointer-events-none"
      >
        <div className="w-[280px] aspect-[9/19] rounded-[2rem] border border-white/15 bg-gradient-to-b from-[#1a1a1c] to-black p-4 shadow-2xl flex flex-col gap-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between text-white">
            <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Hari ini
            </span>
            <span className="text-[10px] text-white/50">14 Feb</span>
          </div>

          {/* Circular progress ring */}
          <div className="flex flex-col items-center gap-1 pt-2">
            <div
              className="size-24 rounded-full grid place-items-center relative"
              style={{
                background:
                  "conic-gradient(var(--primary) 0deg 244deg, rgba(255,255,255,0.08) 244deg 360deg)",
              }}
            >
              <div className="absolute inset-1.5 rounded-full bg-[#1a1a1c] grid place-items-center text-center">
                <div>
                  <p className="text-base font-semibold text-white leading-none">1,420</p>
                  <p className="text-[9px] text-white/50 mt-0.5">/ 2,100 kal</p>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-primary-glow font-medium">68% goal harian</span>
          </div>

          {/* Meal items */}
          <div className="flex flex-col gap-2 mt-1">
            {[
              { e: "🌅", l: "Sarapan", v: "320 kal" },
              { e: "🍽️", l: "Makan siang", v: "680 kal" },
              { e: "🍎", l: "Snack", v: "190 kal" },
            ].map((m) => (
              <div
                key={m.l}
                className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5"
              >
                <span className="text-base leading-none">{m.e}</span>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-white leading-none">{m.l}</p>
                  <p className="text-[9px] text-white/50 mt-0.5">{m.v}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Streak badge */}
          <div className="mt-auto flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
            <Flame className="size-3.5 text-amber-400" />
            <span className="text-[11px] font-medium text-amber-300">Streak 12 hari</span>
          </div>
        </div>
      </div>
    </section>
  );
}
