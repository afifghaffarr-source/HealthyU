/**
 * PromoBanner — renders active "top" placement banners from DB via the
 * getActiveBanners RPC. Dismissible per-banner (session-storage dismiss list).
 * Color mapping: amber → amber-100, emerald → emerald-100, blue → blue-100,
 * rose → rose-100. Unknown colors fall back to primary.
 */
import { useState } from "react";
import { Megaphone, X } from "lucide-react";
import { useActiveBanners } from "@/hooks/use-promo-banners";
import { useTranslation } from "@/lib/i18n";

const COLOR_MAP: Record<string, string> = {
  amber:
    "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800",
  emerald:
    "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800",
  blue: "bg-blue-100 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800",
  rose: "bg-rose-100 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800",
};

const DEFAULT_COLOR =
  "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground border-primary/30";

const DISMISS_KEY = "healthyu.dismissed_banners";

function loadDismissed(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function persistDismissed(ids: Set<string>) {
  try {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]));
  } catch {
    // ponytail: sessionStorage may be blocked (private mode); the dismiss
    // just won't persist across reloads — acceptable degrade.
  }
}

type ActiveBanner = {
  id: string;
  title: string;
  description: string | null;
  cta_label: string | null;
  cta_href: string | null;
  color: string;
};

export function PromoBanner() {
  const { data: banners } = useActiveBanners("top");
  const { t: _t } = useTranslation();
  void _t; // useTranslation kept for parity with other banners + future i18n key wiring
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);

  const visible = (banners ?? []).filter((b: ActiveBanner) => !dismissed.has(b.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-0">
      {visible.map((b: ActiveBanner) => {
        const colorClass = COLOR_MAP[b.color] ?? DEFAULT_COLOR;
        const dismiss = () => {
          const next = new Set(dismissed);
          next.add(b.id);
          setDismissed(next);
          persistDismissed(next);
        };
        return (
          <div
            key={b.id}
            role="status"
            aria-live="polite"
            className={`px-4 py-2 flex items-center justify-center gap-2 text-xs sm:text-sm font-medium border-b ${colorClass}`}
          >
            <Megaphone className="size-3.5 shrink-0" />
            <span className="text-center min-w-0 flex-1 truncate">
              {b.title}
              {b.description && <span className="opacity-80 ml-1">— {b.description}</span>}
            </span>
            {b.cta_label && b.cta_href && (
              <a href={b.cta_href} className="underline whitespace-nowrap font-semibold">
                {b.cta_label}
              </a>
            )}
            <button
              onClick={dismiss}
              aria-label="Dismiss banner"
              className="shrink-0 p-0.5 rounded hover:bg-black/5"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
