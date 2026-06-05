import { ArrowRight } from "lucide-react";

type Photo = {
  id: string;
  signed_url?: string | null;
  weight_kg?: number | null;
  taken_at: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export function BeforeAfterFrame({ photos }: { photos: Photo[] }) {
  const usable = photos.filter((p) => p.signed_url);
  if (usable.length < 2) return null;
  // photos already sorted desc by taken_at in loader → latest first
  const after = usable[0];
  const before = usable[usable.length - 1];
  const dWeight =
    after.weight_kg != null && before.weight_kg != null
      ? Number(after.weight_kg) - Number(before.weight_kg)
      : null;
  const days = Math.max(
    1,
    Math.round(
      (new Date(after.taken_at).getTime() - new Date(before.taken_at).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 space-y-3 animate-fade-up">
      <div>
        <p className="text-sm font-semibold">Sebelum &amp; sesudah</p>
        <p className="text-[11px] text-muted-foreground">
          {days} hari perjalanan
          {dWeight != null && Math.abs(dWeight) >= 0.1
            ? ` · ${dWeight > 0 ? "+" : ""}${dWeight.toFixed(1)} kg`
            : ""}
        </p>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <figure className="space-y-1">
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
            <img
              src={before.signed_url!}
              alt={`Foto sebelum ${fmtDate(before.taken_at)}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <figcaption className="text-[10px] text-muted-foreground text-center">
            Awal · {fmtDate(before.taken_at)}
          </figcaption>
        </figure>
        <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
        <figure className="space-y-1">
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
            <img
              src={after.signed_url!}
              alt={`Foto terbaru ${fmtDate(after.taken_at)}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <figcaption className="text-[10px] text-muted-foreground text-center">
            Terbaru · {fmtDate(after.taken_at)}
          </figcaption>
        </figure>
      </div>
      <p className="text-[11px] text-muted-foreground text-center">
        Progres kecil tetap progres.
      </p>
    </section>
  );
}