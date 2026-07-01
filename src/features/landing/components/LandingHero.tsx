import { Link } from "@tanstack/react-router";
import { ArrowRight, Flame, Shield, Star, Zap } from "lucide-react";
import { AuroraText } from "@/components/magicui/aurora-text";
import { BlurFade } from "@/components/magicui/blur-fade";

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
      {/* Subtle accent glow */}
      <div
        aria-hidden
        className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-3xl pointer-events-none animate-blob"
      />

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
            style={{ fontFamily: "var(--font-display)" }}
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

      {/* Floating badge cards — Apple-style minimal */}
      <div
        className="absolute right-[8%] top-[20%] hidden lg:flex z-10 animate-float"
        style={{ animationDelay: "-2s" }}
      >
        <div className="glass-dark border border-white/10 rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 text-xs">
          <Flame className="size-4 text-amber-500" />
          <div>
            <p className="font-semibold leading-none text-white">Streak 12 hari</p>
            <p className="text-white/50">Konsisten!</p>
          </div>
        </div>
      </div>
      <div
        className="absolute left-[8%] bottom-[18%] hidden lg:flex z-10 animate-float"
        style={{ animationDelay: "-5s" }}
      >
        <div className="glass-dark border border-white/10 rounded-xl px-3 py-2 shadow-lg flex items-center gap-2 text-xs">
          <Zap className="size-4 text-primary-glow" />
          <div>
            <p className="font-semibold leading-none text-white">+120 poin</p>
            <p className="text-white/50">Goal harian</p>
          </div>
        </div>
      </div>
    </section>
  );
}
