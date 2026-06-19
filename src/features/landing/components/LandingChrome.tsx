import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Crown } from "lucide-react";

export function ConfettiBurst() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: 60 }).map((_, i) => (
        <span
          key={i}
          className="absolute top-0 size-2 rounded-sm animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            background: ["#16a34a", "#0ea5e9", "#f59e0b", "#ec4899", "#a855f7"][i % 5],
            animationDelay: `${Math.random() * 0.4}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function LandingBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-32 size-[480px] rounded-full bg-primary/25 blur-3xl animate-blob" />
      <div
        className="absolute top-1/3 -right-40 size-[520px] rounded-full bg-accent/20 blur-3xl animate-blob"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute bottom-0 left-1/3 size-[420px] rounded-full bg-primary-glow/25 blur-3xl animate-blob"
        style={{ animationDelay: "-12s" }}
      />
    </div>
  );
}

export function LandingNav({
  hasSession,
  ctaPrimary,
}: {
  hasSession: boolean | null;
  ctaPrimary: string;
}) {
  return (
    <nav className="sticky top-0 z-30 glass border-b border-white/10">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="font-bold tracking-tight text-lg flex items-center gap-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="relative size-8 rounded-xl grid place-items-center text-sm text-primary-foreground bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/30">
            H
            <span className="absolute -inset-0.5 rounded-xl bg-primary/40 blur-md -z-10" />
          </span>
          HealthyU
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <a href="#fitur" className="hover:text-foreground">
            Fitur
          </a>
          <a href="#cara" className="hover:text-foreground">
            Cara kerja
          </a>
          <a href="#testimoni" className="hover:text-foreground">
            Testimoni
          </a>
          <a href="#faq" className="hover:text-foreground">
            FAQ
          </a>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.18em] border border-white/15 rounded-full px-2 py-0.5 bg-white/5">
            Coba desain lain
          </span>
          <Link to="/flow" className="text-foreground hover:text-primary transition-colors">
            Flow
          </Link>
          <Link to="/prism" className="text-foreground hover:text-primary transition-colors">
            Prism
          </Link>
        </div>
        <Link
          to={ctaPrimary}
          className="relative overflow-hidden bg-gradient-to-r from-primary to-primary-dark text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-shadow"
        >
          <span className="relative z-10">{hasSession ? "Dashboard" : "Masuk"}</span>
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </Link>
      </div>
    </nav>
  );
}

export function PricingSection({ ctaPrimary }: { ctaPrimary: string }) {
  return (
    <section className="max-w-5xl mx-auto px-5 md:px-8 py-16">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass rounded-3xl p-7 border border-primary/30">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">
            Gratis
          </span>
          <h3 className="text-2xl font-bold mt-3" style={{ fontFamily: "var(--font-display)" }}>
            Rp 0 <span className="text-sm font-normal text-muted-foreground">/ selamanya</span>
          </h3>
          <ul className="text-sm space-y-2 mt-4 text-muted-foreground">
            {[
              "Scan makanan AI",
              "Meal plan personal",
              "Puasa & jadwal sholat",
              "HealthyU AI Coach chatbot",
            ].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <Check className="size-4 text-primary" />
                {x}
              </li>
            ))}
          </ul>
          <Link
            to={ctaPrimary}
            className="mt-5 block text-center bg-primary text-primary-foreground font-semibold py-3 rounded-xl"
          >
            Mulai gratis
          </Link>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-accent text-primary-foreground rounded-3xl p-7 shadow-xl">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded-full">
            <Crown className="size-3" /> Premium (segera)
          </span>
          <h3 className="text-2xl font-bold mt-3" style={{ fontFamily: "var(--font-display)" }}>
            Rp 29rb <span className="text-sm font-normal opacity-80">/ bulan</span>
          </h3>
          <ul className="text-sm space-y-2 mt-4 opacity-95">
            {[
              "Konsultasi nutritionist real",
              "Resep premium tanpa batas",
              "Export laporan PDF",
              "Sinkron Apple/Google Fit",
            ].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <Check className="size-4" />
                {x}
              </li>
            ))}
          </ul>
          <button className="mt-5 w-full text-center bg-white text-primary font-semibold py-3 rounded-xl">
            Notify saya
          </button>
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection({
  ctaPrimary,
  ctaPrimaryLabel,
  onCtaClick,
}: {
  ctaPrimary: string;
  ctaPrimaryLabel: string;
  onCtaClick: () => void;
}) {
  return (
    <section className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24 text-center">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-accent text-primary-foreground rounded-3xl p-10 md:p-14 space-y-5 shadow-2xl shadow-primary/30">
        <div
          aria-hidden
          className="absolute -top-20 -right-20 size-72 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-20 -left-20 size-72 rounded-full bg-white/10 blur-3xl"
        />
        <h2
          className="relative text-3xl md:text-5xl font-bold tracking-tight text-balance"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Mulai perjalanan sehatmu hari ini
        </h2>
        <p className="relative text-primary-foreground/85 text-balance">
          Gratis selamanya. Tanpa kartu kredit. Hasil terlihat dalam 7 hari pertama.
        </p>
        <div className="relative flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to={ctaPrimary}
            onClick={onCtaClick}
            className="group inline-flex items-center justify-center gap-2 bg-white text-primary font-semibold py-4 px-6 rounded-2xl shadow-xl hover:-translate-y-0.5 transition-transform"
          >
            {ctaPrimaryLabel}
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <ul className="relative flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-primary-foreground/80 pt-2">
          <li className="flex items-center gap-1">
            <Check className="size-3.5" /> Gratis selamanya
          </li>
          <li className="flex items-center gap-1">
            <Check className="size-3.5" /> Database makanan Indonesia
          </li>
          <li className="flex items-center gap-1">
            <Check className="size-3.5" /> AI coach 24/7
          </li>
        </ul>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} HealthyU · Dirancang khusus untuk Indonesia</p>
        <div className="flex gap-4">
          <Link to="/auth">Masuk</Link>
          <Link to="/privacy">Privasi</Link>
          <a href="#faq">FAQ</a>
        </div>
      </div>
    </footer>
  );
}

export function StickyCta({
  show,
  hasSession,
  ctaPrimary,
  onCtaClick,
}: {
  show: boolean;
  hasSession: boolean | null;
  ctaPrimary: string;
  onCtaClick: () => void;
}) {
  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 bottom-4 z-40 transition-all ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"}`}
    >
      <div className="glass border border-white/20 shadow-2xl rounded-full pl-4 pr-1 py-1 flex items-center gap-3">
        <span className="text-xs font-semibold hidden sm:inline">
          Siap memulai? Gratis selamanya.
        </span>
        <Link
          to={ctaPrimary}
          onClick={onCtaClick}
          className="bg-gradient-to-r from-primary to-primary-dark text-primary-foreground text-xs font-bold px-4 py-2 rounded-full inline-flex items-center gap-1.5"
        >
          {hasSession ? "Dashboard" : "Mulai"} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
