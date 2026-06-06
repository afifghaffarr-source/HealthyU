import { Link } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { CoinPill } from "@/components/healthyu/coin-pill";

export function DashboardHeader({
  greeting,
  fullName,
  subtitle,
  bonusAvailable,
  onClaimBonus,
  claiming,
}: {
  greeting: string;
  fullName?: string | null;
  subtitle?: string;
  bonusAvailable?: boolean;
  onClaimBonus?: () => void;
  claiming?: boolean;
}) {
  return (
    <header className="flex justify-between items-start animate-fade-up">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">
          {greeting}
        </p>
        <h1 className="text-2xl font-bold">Halo, {fullName?.split(" ")[0] ?? "Sahabat"}!</h1>
        {subtitle && (
          <p className="text-[13px] text-muted-foreground mt-1 leading-snug">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {bonusAvailable && onClaimBonus && (
          <button
            onClick={onClaimBonus}
            disabled={claiming}
            aria-label="Klaim bonus harian"
            className="inline-flex items-center gap-1 h-11 px-3 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 text-xs font-semibold outline-1 outline-amber-500/30 disabled:opacity-60"
          >
            <Gift className="size-3.5" />
            Bonus
          </button>
        )}
        <CoinPill />
        <Link
          to="/profile"
          className="size-11 rounded-full bg-card outline-1 outline-black/10 grid place-items-center font-bold text-primary"
        >
          {(fullName ?? "U").slice(0, 1).toUpperCase()}
        </Link>
      </div>
    </header>
  );
}

export function dashboardGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}