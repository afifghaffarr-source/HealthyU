import { Utensils } from "lucide-react";

/**
 * Tiny rotating local-food hint for Indonesian users. Picks a hint based on
 * the current hour bucket (breakfast / lunch / dinner / late) — no DB, no
 * AI call, just warm everyday inspiration.
 */
const HINTS = {
  breakfast: [
    "Bubur ayam tanpa kerupuk + telur rebus = sarapan ringan kaya protein.",
    "Roti gandum + selai kacang + pisang — cepat & bikin kenyang.",
    "Nasi uduk porsi kecil + tempe orek + timun, jangan lupa air putih.",
  ],
  lunch: [
    "Nasi merah + ayam bakar + tumis kangkung — seimbang dan ramah kalori.",
    "Gado-gado tanpa kerupuk + tahu/tempe rebus, kuah kacang secukupnya.",
    "Soto ayam bening + sedikit nasi + jeruk nipis, hindari kerupuk.",
  ],
  dinner: [
    "Sup ikan + nasi merah sedikit + sayur bening = makan malam ringan.",
    "Ayam panggang + brokoli kukus + ubi rebus kecil.",
    "Tahu/tempe bacem + sayur asem + nasi setengah porsi.",
  ],
  late: [
    "Lapar malam? Pisang + segelas susu rendah lemak biasanya cukup.",
    "Yogurt plain + beberapa potong buah lebih ramah daripada gorengan.",
    "Telur rebus + air putih hangat — ringan dan tidak begah.",
  ],
} as const;

function bucketFor(hour: number): keyof typeof HINTS {
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 21) return "dinner";
  return "late";
}

export function LocalFoodHintCard({ hour }: { hour: number }) {
  const bucket = bucketFor(hour);
  const list = HINTS[bucket];
  // Stable pick within the bucket per-day so it doesn't flicker on re-render.
  const today = new Date();
  const seed = today.getDate() + today.getMonth();
  const hint = list[seed % list.length];
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 dark:outline-white/10 animate-fade-up">
      <div className="flex items-start gap-3">
        <span
          className="size-9 rounded-xl bg-secondary text-foreground grid place-items-center shrink-0"
          aria-hidden
        >
          <Utensils className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Ide makan lokal
          </p>
          <p className="text-sm mt-0.5 leading-snug">{hint}</p>
        </div>
      </div>
    </section>
  );
}
