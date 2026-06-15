import { Link } from "@tanstack/react-router";
import { ArrowRight, Camera, Droplets, Moon, Sparkles, Utensils } from "lucide-react";

type Step = {
  to: string;
  label: string;
  hint: string;
  Icon: typeof Camera;
};

// eslint-disable-next-line react-refresh/only-export-components
export function computeNextStep({
  hour,
  mealCount,
  waterMl,
  waterTarget,
  fastActive,
  remainingKcal,
}: {
  hour: number;
  mealCount: number;
  waterMl: number;
  waterTarget: number;
  fastActive: boolean;
  remainingKcal: number;
}): Step {
  if (fastActive && waterMl < waterTarget * 0.4) {
    return {
      to: "/water",
      label: "Minum air dulu",
      hint: "Hidrasi penting saat puasa",
      Icon: Droplets,
    };
  }
  if (hour >= 7 && hour < 11 && mealCount === 0 && !fastActive) {
    return {
      to: "/scan",
      label: "Catat sarapan",
      hint: "Scan foto atau cari manual",
      Icon: Camera,
    };
  }
  if (hour >= 11 && hour < 15 && mealCount < 2 && !fastActive) {
    return {
      to: "/scan",
      label: "Catat makan siang",
      hint: "Estimasi cepat dengan foto",
      Icon: Utensils,
    };
  }
  if (hour >= 17 && hour < 21 && mealCount < 3 && !fastActive && remainingKcal > 300) {
    return {
      to: "/scan",
      label: "Catat makan malam",
      hint: `Sisa ~${Math.round(remainingKcal)} kkal`,
      Icon: Utensils,
    };
  }
  if (waterMl < waterTarget * 0.5) {
    return {
      to: "/water",
      label: "Minum air segelas",
      hint: "Target hidrasi belum tercapai",
      Icon: Droplets,
    };
  }
  if (hour >= 21) {
    return {
      to: "/sleep",
      label: "Siapkan tidur",
      hint: "Catat jam tidur biar konsisten",
      Icon: Moon,
    };
  }
  return {
    to: "/recommendations",
    label: "Lihat rekomendasi",
    hint: "Ide menu personal dari AI",
    Icon: Sparkles,
  };
}

export function SmartNextStepCard(
  props: Parameters<typeof computeNextStep>[0] & { timezone?: string | null },
) {
  // Prefer user's profile timezone if provided; fall back to passed-in hour.
  let hour = props.hour;
  if (props.timezone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: props.timezone,
      }).formatToParts(new Date());
      const h = Number(parts.find((p) => p.type === "hour")?.value);
      if (Number.isFinite(h)) hour = h === 24 ? 0 : h;
    } catch {
      // invalid tz — keep prop
    }
  }
  const step = computeNextStep({ ...props, hour });
  const { Icon } = step;
  return (
    <Link
      to={step.to}
      className="flex items-center gap-3 p-4 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 outline-1 outline-primary/15 active:scale-[0.99] transition animate-fade-up"
      aria-label={`Langkah berikutnya: ${step.label}`}
    >
      <span className="size-11 rounded-2xl bg-card grid place-items-center text-primary shrink-0">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-wider text-primary/70">
          Langkah berikutnya
        </p>
        <p className="font-semibold text-sm truncate">{step.label}</p>
        <p className="text-xs text-muted-foreground truncate">{step.hint}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground shrink-0" />
    </Link>
  );
}
