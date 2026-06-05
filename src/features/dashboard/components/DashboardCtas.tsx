import { Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Sparkles, Trophy, Snowflake } from "lucide-react";
import { StreakRing } from "@/components/healthyu/streak-ring";

export function ScanCta() {
  return (
    <Link
      to="/scan"
      className="block bg-card p-4 rounded-3xl outline-1 outline-primary/20 shadow-sm flex items-center gap-4 animate-fade-up"
    >
      <div className="size-12 rounded-2xl bg-primary/10 grid place-items-center">
        <Camera className="size-6 text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm inline-flex items-center gap-1">
          Scan Makanan <Sparkles className="size-3 text-primary" />
        </p>
        <p className="text-[11px] text-muted-foreground">Foto → AI kenali kalori otomatis</p>
      </div>
      <ArrowRight className="size-5 text-muted-foreground" />
    </Link>
  );
}

export function AiRecommendationsCta() {
  return (
    <Link
      to="/recommendations"
      className="block bg-card p-4 rounded-3xl outline-1 outline-primary/20 shadow-sm flex items-center gap-4 animate-fade-up"
    >
      <div className="size-12 rounded-2xl bg-primary/10 grid place-items-center">
        <Sparkles className="size-6 text-primary" />
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm">Rekomendasi Meal Plan AI</p>
        <p className="text-[11px] text-muted-foreground">
          Personal sesuai sisa kalori & profil
        </p>
      </div>
      <ArrowRight className="size-5 text-muted-foreground" />
    </Link>
  );
}

export function AiChatCta() {
  return (
    <Link
      to="/chat"
      className="block bg-gradient-to-br from-sage to-sage-deep p-5 rounded-3xl text-primary-foreground relative overflow-hidden animate-fade-up"
    >
      <div className="absolute -right-6 -bottom-6 size-32 bg-white/10 rounded-full blur-2xl" />
      <div className="relative z-10 flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
          <Sparkles className="size-6" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-lg">Tanya Dr. Healthy</p>
          <p className="text-xs text-white/80">"Berapa kalori 1 porsi rendang?"</p>
        </div>
        <ArrowRight className="size-5" />
      </div>
    </Link>
  );
}

export function GamificationCard({
  streak,
  level,
  xp,
  onFreeze,
}: {
  streak: number;
  level: number;
  xp: number;
  onFreeze: () => void;
}) {
  return (
    <div className="bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex items-center gap-3 animate-fade-up">
      <Link to="/achievements" className="flex items-center gap-3 flex-1 min-w-0">
        <StreakRing days={streak} goal={30} size={64} />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
            Level {level} · {xp} XP
          </p>
          <p className="font-semibold text-sm">Streak {streak} hari</p>
        </div>
        <Trophy className="size-5 text-primary" />
      </Link>
      <button
        onClick={onFreeze}
        aria-label="Streak freeze"
        className="size-10 rounded-xl bg-sky-100 grid place-items-center"
      >
        <Snowflake className="size-5 text-sky-600" />
      </button>
    </div>
  );
}