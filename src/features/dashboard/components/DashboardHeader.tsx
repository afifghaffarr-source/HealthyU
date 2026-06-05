import { Link } from "@tanstack/react-router";
import { CoinPill } from "@/components/healthyu/coin-pill";

export function DashboardHeader({
  greeting,
  fullName,
}: {
  greeting: string;
  fullName?: string | null;
}) {
  return (
    <header className="flex justify-between items-start animate-fade-up">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary/70 mb-1">
          {greeting}
        </p>
        <h1 className="text-2xl font-bold">Halo, {fullName?.split(" ")[0] ?? "Sahabat"}!</h1>
      </div>
      <div className="flex items-center gap-2">
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