import { useOnboardingFlag } from "@/hooks/use-onboarding-flag";
import { X } from "lucide-react";

interface Props {
  flagKey: string;
  title: string;
  description: string;
}

export function Coachmark({ flagKey, title, description }: Props) {
  const { showOnboarding, dismiss } = useOnboardingFlag(flagKey);
  if (!showOnboarding) return null;
  return (
    <div className="rounded-2xl bg-primary/10 outline-1 outline-primary/30 p-3 flex items-start gap-3 motion-safe:animate-fade-up">
      <div className="flex-1 space-y-0.5">
        <p className="text-xs font-bold text-primary" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </p>
        <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Tutup tip"
        className="size-6 rounded-full grid place-items-center text-muted-foreground hover:bg-card transition"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}