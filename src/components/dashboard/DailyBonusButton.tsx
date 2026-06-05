import { ArrowRight, Gift } from "lucide-react";

export function DailyBonusButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-4 rounded-3xl bg-gradient-to-r from-amber-400/20 to-orange-500/20 outline-1 outline-amber-500/30 text-left animate-fade-up"
    >
      <div className="size-11 rounded-2xl bg-amber-100 grid place-items-center">
        <Gift className="size-5 text-amber-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">Klaim bonus harian</p>
        <p className="text-xs text-muted-foreground">Tap untuk dapat koin & jaga streakmu</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground" />
    </button>
  );
}