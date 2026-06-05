import { useState } from "react";

export function BeforeAfter() {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative aspect-[16/9] rounded-3xl overflow-hidden border border-white/15 shadow-xl select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-200 to-rose-400 grid place-items-center text-rose-900 font-bold text-2xl">
        SEBELUM · 78 kg
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold text-2xl"
        style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
      >
        SESUDAH · 65 kg
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(+e.target.value)}
        className="absolute inset-x-0 bottom-3 mx-auto w-3/4 accent-white"
        aria-label="Slider sebelum sesudah"
      />
      <div
        className="absolute top-0 bottom-8 w-0.5 bg-white shadow-lg pointer-events-none"
        style={{ left: `${pos}%` }}
      />
    </div>
  );
}