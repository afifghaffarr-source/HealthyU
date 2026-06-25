import { Link } from "@tanstack/react-router";
import { Droplet, Plus } from "lucide-react";

export function WaterCard({
  waterMl,
  targetMl,
  onLog,
  disabled,
  justLogged = false,
}: {
  waterMl: number;
  targetMl: number;
  onLog: (ml: number) => void;
  disabled?: boolean;
  justLogged?: boolean;
}) {
  return (
    <Link
      to="/water"
      className={`bg-card p-4 rounded-3xl outline-1 outline-black/5 shadow-sm flex items-center gap-4 animate-fade-up transition-transform ${
        justLogged ? "animate-pulse-scale" : ""
      }`}
    >
      <div className="size-12 rounded-2xl bg-sky-100 grid place-items-center">
        <Droplet className="size-5 text-sky-600" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Air</p>
        <p className="text-lg font-bold tabular-nums">
          {(waterMl / 1000).toFixed(1)}L{" "}
          <span className="text-xs text-muted-foreground font-medium">/ {targetMl / 1000}L</span>
        </p>
      </div>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onLog(250);
        }}
        disabled={disabled}
        className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-xl inline-flex items-center gap-1"
      >
        <Plus className="size-3.5" /> 250ml
      </button>
    </Link>
  );
}
