import {
  createContext,
  createElement,
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

export type TranslationKey =
  | "pdf.footer.pageLabel"
  | "pdf.footer.brandLabel"
  | "pdf.backLink"
  | "pdf.toc.continued"
  | "pdf.tooltip.navigation"
  | "pdf.pageShort"
  | "pdf.contentsLink"
  | "pdf.title.weekly7"
  | "pdf.title.archive"
  | "pdf.headers.date"
  | "pdf.headers.metric"
  | "pdf.headers.value"
  | "pdf.headers.calIn"
  | "pdf.headers.water"
  | "pdf.headers.burn"
  | "pdf.headers.sleep";

export type TranslationBundle = Record<TranslationKey, string>;

export const bundles = {
  id: {
    "pdf.footer.pageLabel": DEFAULT_PDF_FOOTER_PAGE_LABEL,
    "pdf.footer.brandLabel": DEFAULT_PDF_FOOTER_BRAND_LABEL,
    "pdf.backLink": "hal. {page} ← Daftar Isi",
    "pdf.toc.continued": "Daftar Isi (lanjutan {n}/{m})",
    "pdf.tooltip.navigation": "Navigasi",
    "pdf.pageShort": "hal. {page}",
    "pdf.contentsLink": "← Daftar Isi",
    "pdf.title.weekly7": "Laporan HealthyU - 7 Hari",
    "pdf.title.archive": "Arsip Laporan HealthyU",
    "pdf.headers.date": "Tanggal",
    "pdf.headers.metric": "Metrik",
    "pdf.headers.value": "Nilai",
    "pdf.headers.calIn": "Kalori (kcal)",
    "pdf.headers.water": "Air (ml)",
    "pdf.headers.burn": "Bakar (kcal)",
    "pdf.headers.sleep": "Tidur (jam)",
  },
  en: {
    "pdf.footer.pageLabel": "page",
    "pdf.footer.brandLabel": "HealthyU · exported",
    "pdf.backLink": "p. {page} ← Contents",
    "pdf.toc.continued": "Contents (continued {n}/{m})",
    "pdf.tooltip.navigation": "Navigation",
    "pdf.pageShort": "p. {page}",
    "pdf.contentsLink": "← Contents",
    "pdf.title.weekly7": "HealthyU Report - 7 Days",
    "pdf.title.archive": "HealthyU Report Archive",
    "pdf.headers.date": "Date",
    "pdf.headers.metric": "Metric",
    "pdf.headers.value": "Value",
    "pdf.headers.calIn": "Calories (kcal)",
    "pdf.headers.water": "Water (ml)",
    "pdf.headers.burn": "Burn (kcal)",
    "pdf.headers.sleep": "Sleep (h)",
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
    try {
      const saved = window.localStorage.getItem(LS_KEY);
      return saved && saved in bundles ? (saved as Locale) : defaultLocale;
    } catch {
      return defaultLocale;
    }
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LS_KEY, l);
      } catch {
        // privacy mode / unavailable storage
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nCtx>(
    () => ({ bundle: bundles[locale], locale, setLocale }),
    [locale, setLocale],
  );

  return createElement(I18nContext.Provider, { value }, children);
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