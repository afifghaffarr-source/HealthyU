import { Info, ShieldAlert, Stethoscope } from "lucide-react";

type Variant = "ai-estimate" | "not-medical" | "review-first";

const COPY: Record<Variant, { text: string; Icon: typeof Info }> = {
  "ai-estimate": {
    text: "Estimasi AI — periksa porsi & kalori sebelum simpan",
    Icon: Info,
  },
  "not-medical": {
    text: "Saran umum, bukan saran medis",
    Icon: Stethoscope,
  },
  "review-first": {
    text: "Periksa sebelum simpan",
    Icon: ShieldAlert,
  },
};

export function SafetyChip({
  variant = "ai-estimate",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const { text, Icon } = COPY[variant];
  return (
    <div
      role="note"
      className={`inline-flex items-center gap-1.5 text-[12px] leading-snug text-muted-foreground bg-muted/60 dark:bg-muted/40 rounded-full px-3 py-1.5 ${className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span>{text}</span>
    </div>
  );
}
