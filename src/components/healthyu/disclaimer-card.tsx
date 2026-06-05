import { Stethoscope } from "lucide-react";

export function DisclaimerCard({
  title = "HealthyU bukan pengganti dokter",
  body = "Informasi di sini bersifat edukatif. Untuk kondisi medis, kehamilan, gangguan makan, diabetes, atau penyakit kronis, konsultasikan ke tenaga kesehatan profesional.",
  className = "",
}: {
  title?: string;
  body?: string;
  className?: string;
}) {
  return (
    <aside
      role="note"
      aria-label="Disclaimer medis"
      className={`flex gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 outline-1 outline-amber-500/30 ${className}`}
    >
      <div className="size-9 shrink-0 rounded-xl bg-amber-100 dark:bg-amber-900/40 grid place-items-center text-amber-700 dark:text-amber-300">
        <Stethoscope className="size-4" aria-hidden />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{title}</p>
        <p className="text-[12px] leading-relaxed text-amber-900/80 dark:text-amber-100/80">
          {body}
        </p>
      </div>
    </aside>
  );
}