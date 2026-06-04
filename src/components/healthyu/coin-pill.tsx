import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/profile.functions";
import { Coins } from "lucide-react";

export function CoinPill() {
  const fn = useServerFn(getProfile);
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => fn() });
  const coins = (data as { health_coins?: number } | undefined)?.health_coins ?? 0;
  return (
    <Link
      to="/currency"
      className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 outline-1 outline-amber-500/30 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:scale-105 transition"
      aria-label={`Saldo koin: ${coins}`}
    >
      <Coins className="size-3.5" />
      {coins.toLocaleString("id-ID")}
    </Link>
  );
}
