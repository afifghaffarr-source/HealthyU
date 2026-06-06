import { Camera, Droplets, Trophy, Utensils } from "lucide-react";

export function NonScaleWinsCard({
  mealsLogged,
  waterReached,
  photosCount,
  calorieOnTrack,
}: {
  mealsLogged: number;
  waterReached: boolean;
  photosCount: number;
  calorieOnTrack: boolean;
}) {
  const wins = [
    {
      label: "Makanan tercatat",
      value: `${mealsLogged} item`,
      Icon: Utensils,
      hit: mealsLogged > 0,
    },
    {
      label: "Target air",
      value: waterReached ? "Tercapai" : "Belum",
      Icon: Droplets,
      hit: waterReached,
    },
    {
      label: "Foto progres",
      value: `${photosCount}`,
      Icon: Camera,
      hit: photosCount > 0,
    },
    {
      label: "Kalori",
      value: calorieOnTrack ? "Seimbang" : "Bisa diseimbangkan",
      Icon: Trophy,
      hit: calorieOnTrack,
    },
  ];
  return (
    <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 space-y-3 animate-fade-up">
      <div>
        <p className="font-bold">Kemenangan hari ini</p>
        <p className="text-[12px] text-muted-foreground">
          Bukan cuma angka berat — progres kecil tetap progres.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {wins.map((w) => (
          <li
            key={w.label}
            className={`p-3 rounded-2xl flex items-start gap-2 ${w.hit ? "bg-primary/10" : "bg-muted/50"}`}
          >
            <span
              className={`size-8 rounded-lg grid place-items-center shrink-0 ${w.hit ? "bg-primary/20 text-primary" : "bg-background text-muted-foreground"}`}
              aria-hidden
            >
              <w.Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">{w.label}</span>
              <span className="block text-xs font-semibold truncate">{w.value}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
