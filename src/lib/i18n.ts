import { createContext, useContext } from "react";
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
  | "pdf.footer.brandLabel";

export type TranslationBundle = Record<TranslationKey, string>;

export const defaultBundle: TranslationBundle = {
  "pdf.footer.pageLabel": DEFAULT_PDF_FOOTER_PAGE_LABEL,
  "pdf.footer.brandLabel": DEFAULT_PDF_FOOTER_BRAND_LABEL,
};

const I18nContext = createContext<TranslationBundle>(defaultBundle);

export const I18nProvider = I18nContext.Provider;

export function useTranslation() {
  const bundle = useContext(I18nContext);
  return {
    t: (key: TranslationKey): string => bundle[key] ?? defaultBundle[key] ?? key,
  };
}