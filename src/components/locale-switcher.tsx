import { useLocale, useTranslation, type Locale } from "@/lib/i18n";

/**
 * Reusable ID/EN locale switcher. Reads/writes via `useLocale()` (persisted
 * in localStorage by I18nProvider). Style is intentionally minimal so it can
 * be dropped into headers, settings rows, footers, etc.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();
  return (
    <div className={`flex items-center justify-between gap-3 px-1 ${className ?? ""}`}>
      <label htmlFor="locale-switcher" className="text-xs font-semibold text-muted-foreground">
        {t("prefs.languageLabel")}
      </label>
      <select
        id="locale-switcher"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="text-xs bg-card outline-1 outline-black/10 rounded-lg px-2 py-1"
      >
        <option value="id">Bahasa Indonesia</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
