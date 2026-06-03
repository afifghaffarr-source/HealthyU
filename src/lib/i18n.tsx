import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  PDF_FOOTER_PAGE_LABEL as DEFAULT_PDF_FOOTER_PAGE_LABEL,
  PDF_FOOTER_BRAND_LABEL as DEFAULT_PDF_FOOTER_BRAND_LABEL,
} from "./constants";

/**
 * Minimal i18n resource bundle. Real apps replace `defaultBundle` with a
 * locale-aware loader; consumers call `useTranslation()` instead of
 * importing constants directly. Compile-time constants act as fallbacks.
 */
export type TranslationKey =
  | "pdf.footer.pageLabel"
  | "pdf.footer.brandLabel"
  | "pdf.backLink";

/** Template string `{page}` → page number. */
export type TranslationBundle = Record<TranslationKey, string>;

export const bundles = {
  id: {
  "pdf.footer.pageLabel": DEFAULT_PDF_FOOTER_PAGE_LABEL,
  "pdf.footer.brandLabel": DEFAULT_PDF_FOOTER_BRAND_LABEL,
    "pdf.backLink": "hal. {page} \u2190 Daftar Isi",
  },
  en: {
    "pdf.footer.pageLabel": "page",
    "pdf.footer.brandLabel": "HealthyU \u00B7 exported",
    "pdf.backLink": "p. {page} \u2190 Contents",
  },
} satisfies Record<string, TranslationBundle>;

export type Locale = keyof typeof bundles;
export const defaultLocale: Locale = "id";
export const defaultBundle: TranslationBundle = bundles[defaultLocale];

type I18nCtx = {
  bundle: TranslationBundle;
  locale: Locale;
  setLocale: (l: Locale) => void;
};

const I18nContext = createContext<I18nCtx>({
  bundle: defaultBundle,
  locale: defaultLocale,
  setLocale: () => {},
});

const LS_KEY = "i18n:locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return defaultLocale;
    const saved = window.localStorage.getItem(LS_KEY);
    return saved && saved in bundles ? (saved as Locale) : defaultLocale;
  });
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(LS_KEY, l);
  }, []);
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo<I18nCtx>(
    () => ({ bundle: bundles[locale], locale, setLocale }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale() {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
}

export function useTranslation() {
  const { bundle } = useContext(I18nContext);
  return {
    t: (key: TranslationKey, vars?: Record<string, string | number>): string => {
      const tpl = bundle[key] ?? defaultBundle[key] ?? key;
      if (!vars) return tpl;
      return tpl.replace(/\{(\w+)\}/g, (_m, k: string) =>
        vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
      );
    },
  };
}