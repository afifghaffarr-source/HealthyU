import { ShieldCheck, Lock, FileCheck2 } from "lucide-react";

/**
 * Hero banner for the Privacy Vault page (/profile/privacy).
 *
 * Design intent:
 * - Calm, reassuring tone (privacy is anxiety-inducing; reduce "gotcha" feel).
 * - Three concrete promises visible at-a-glance: kontrol, transparansi, kepatuhan.
 * - Pure presentational — no data fetching. Lives at top of /profile/privacy.
 */
export function PrivacyVaultHero({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-primary/15 grid place-items-center shrink-0">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-base">Brankas Privasi</div>
          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Semua data kesehatan Anda adalah milik Anda. HealthyU tunduk pada UU Perlindungan Data
            Pribadi No. 27/2022 — Anda berhak tahu, ekspor, dan hapus kapan saja.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="rounded-xl bg-card/60 border border-primary/10 p-3 flex items-center gap-2">
          <Lock className="size-4 text-primary shrink-0" />
          <div className="text-[11px] leading-tight">
            <div className="font-medium">Enkripsi</div>
            <div className="text-muted-foreground">saat istirahat & transit</div>
          </div>
        </div>
        <div className="rounded-xl bg-card/60 border border-primary/10 p-3 flex items-center gap-2">
          <FileCheck2 className="size-4 text-primary shrink-0" />
          <div className="text-[11px] leading-tight">
            <div className="font-medium">Audit log transparan</div>
            <div className="text-muted-foreground">siapa akses apa, kapan</div>
          </div>
        </div>
      </div>
    </div>
  );
}
