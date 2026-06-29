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
  // PDF
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
  | "pdf.headers.sleep"
  // App — navigation
  | "nav.home"
  | "nav.scan"
  | "nav.fasting"
  | "nav.workout"
  | "nav.coach"
  | "nav.profile"
  | "nav.database"
  // App — pengaturan index
  | "settings.title"
  | "settings.subtitle"
  | "settings.account"
  | "settings.profile"
  | "settings.privacy"
  | "settings.backup"
  | "settings.experience"
  | "settings.preferences"
  | "settings.notifications"
  | "settings.chatSettings"
  | "settings.patternDetection"
  | "settings.about"
  | "settings.privacyPolicy"
  | "settings.faq"
  | "settings.dataControl"
  | "settings.dataControlDesc"
  | "settings.version"
  // App — pengaturan/preferensi
  | "prefs.title"
  | "prefs.subtitle"
  | "prefs.loading"
  | "prefs.error"
  | "prefs.retry"
  | "prefs.unitLabel"
  | "prefs.unitDesc"
  | "prefs.languageLabel"
  | "prefs.languageDesc"
  | "prefs.themeLabel"
  | "prefs.themeDesc"
  | "prefs.timezoneLabel"
  | "prefs.timezoneDesc"
  | "prefs.saved"
  | "prefs.syncNote"
  // App — pengaturan/chat
  | "chat.title"
  | "chat.subtitle"
  | "chat.loading"
  | "chat.error"
  | "chat.retry"
  | "chat.retentionTitle"
  | "chat.retentionDesc"
  | "chat.currently"
  | "chat.save"
  | "chat.saving"
  | "chat.deleteTitle"
  | "chat.deleteDesc"
  | "chat.deleteBtn"
  | "chat.deleting"
  | "chat.saved"
  | "chat.retentionFootnote"
  // App — common
  | "common.back"
  | "common.save"
  | "common.cancel"
  | "common.confirm";

/** Template string `{page}` → page number. */
export type TranslationBundle = Record<TranslationKey, string>;

// eslint-disable-next-line react-refresh/only-export-components
export const bundles = {
  id: {
    // PDF
    "pdf.footer.pageLabel": DEFAULT_PDF_FOOTER_PAGE_LABEL,
    "pdf.footer.brandLabel": DEFAULT_PDF_FOOTER_BRAND_LABEL,
    "pdf.backLink": "hal. {page} \u2190 Daftar Isi",
    "pdf.toc.continued": "Daftar Isi (lanjutan {n}/{m})",
    "pdf.tooltip.navigation": "Navigasi",
    "pdf.pageShort": "hal. {page}",
    "pdf.contentsLink": "\u2190 Daftar Isi",
    "pdf.title.weekly7": "Laporan HealthyU - 7 Hari",
    "pdf.title.archive": "Arsip Laporan HealthyU",
    "pdf.headers.date": "Tanggal",
    "pdf.headers.metric": "Metrik",
    "pdf.headers.value": "Nilai",
    "pdf.headers.calIn": "Kalori (kcal)",
    "pdf.headers.water": "Air (ml)",
    "pdf.headers.burn": "Bakar (kcal)",
    "pdf.headers.sleep": "Tidur (jam)",
    // Navigation
    "nav.home": "Beranda",
    "nav.scan": "Scan",
    "nav.fasting": "Puasa",
    "nav.workout": "Latihan",
    "nav.coach": "AI Coach",
    "nav.profile": "Saya",
    "nav.database": "Database",
    // Settings index
    "settings.title": "Pengaturan",
    "settings.subtitle": "Atur akun, privasi, & preferensi",
    "settings.account": "Akun",
    "settings.profile": "Profil saya",
    "settings.privacy": "Privasi & Data",
    "settings.backup": "Backup & Ekspor",
    "settings.experience": "Pengalaman",
    "settings.preferences": "Preferensi",
    "settings.notifications": "Notifikasi",
    "settings.chatSettings": "Pengaturan Chat",
    "settings.patternDetection": "Deteksi Pola",
    "settings.about": "Tentang",
    "settings.privacyPolicy": "Kebijakan Privasi",
    "settings.faq": "FAQ",
    "settings.dataControl": "Data Anda, kendali Anda",
    "settings.dataControlDesc":
      "Atur privasi, backup data, atau hapus akun kapan saja. Sesuai UU PDP.",
    "settings.version": "HealthyU v1.0",
    // Preferences page
    "prefs.title": "Preferensi",
    "prefs.subtitle": "Sesuaikan tampilan & unit",
    "prefs.loading": "Memuat preferensi\u2026",
    "prefs.error": "Gagal memuat preferensi",
    "prefs.retry": "Coba lagi",
    "prefs.unitLabel": "Unit Pengukuran",
    "prefs.unitDesc": "Untuk berat & tinggi badan",
    "prefs.languageLabel": "Bahasa",
    "prefs.languageDesc": "Antarmuka aplikasi",
    "prefs.themeLabel": "Tema",
    "prefs.themeDesc": "Tampilan terang/gelap",
    "prefs.timezoneLabel": "Zona Waktu",
    "prefs.timezoneDesc": "Untuk jadwal shalat & pengingat",
    "prefs.saved": "Tersimpan",
    "prefs.syncNote": "Preferensi disimpan ke akun Anda dan disinkronkan antar perangkat.",
    // Chat settings page
    "chat.title": "Pengaturan Chat",
    "chat.subtitle": "Retensi & privasi",
    "chat.loading": "Memuat\u2026",
    "chat.error": "Gagal memuat",
    "chat.retry": "Coba lagi",
    "chat.retentionTitle": "Retensi Chat Otomatis",
    "chat.retentionDesc": "Pilih berapa lama chat Anda tersimpan.",
    "chat.currently": "Saat ini",
    "chat.save": "Simpan",
    "chat.saving": "Menyimpan\u2026",
    "chat.deleteTitle": "Hapus semua chat sekarang",
    "chat.deleteDesc":
      "Menghapus seluruh riwayat chat Anda secara permanen. Tidak dapat dibatalkan.",
    "chat.deleteBtn": "Hapus semua chat",
    "chat.deleting": "Menghapus\u2026",
    "chat.saved": "Pengaturan retensi tersimpan",
    "chat.retentionFootnote":
      "Periode retensi: {min}\u2013{max} hari (10 tahun). UUID UU PDP 2022 compliance.",
    // Common
    "common.back": "Kembali",
    "common.save": "Simpan",
    "common.cancel": "Batal",
    "common.confirm": "Konfirmasi",
  },
  en: {
    // PDF
    "pdf.footer.pageLabel": "page",
    "pdf.footer.brandLabel": "HealthyU \u00B7 exported",
    "pdf.backLink": "p. {page} \u2190 Contents",
    "pdf.toc.continued": "Contents (continued {n}/{m})",
    "pdf.tooltip.navigation": "Navigation",
    "pdf.pageShort": "p. {page}",
    "pdf.contentsLink": "\u2190 Contents",
    "pdf.title.weekly7": "HealthyU Report - 7 Days",
    "pdf.title.archive": "HealthyU Report Archive",
    "pdf.headers.date": "Date",
    "pdf.headers.metric": "Metric",
    "pdf.headers.value": "Value",
    "pdf.headers.calIn": "Calories (kcal)",
    "pdf.headers.water": "Water (ml)",
    "pdf.headers.burn": "Burn (kcal)",
    "pdf.headers.sleep": "Sleep (h)",
    // Navigation
    "nav.home": "Home",
    "nav.scan": "Scan",
    "nav.fasting": "Fasting",
    "nav.workout": "Workout",
    "nav.coach": "AI Coach",
    "nav.profile": "Profile",
    "nav.database": "Database",
    // Settings index
    "settings.title": "Settings",
    "settings.subtitle": "Manage account, privacy & preferences",
    "settings.account": "Account",
    "settings.profile": "My Profile",
    "settings.privacy": "Privacy & Data",
    "settings.backup": "Backup & Export",
    "settings.experience": "Experience",
    "settings.preferences": "Preferences",
    "settings.notifications": "Notifications",
    "settings.chatSettings": "Chat Settings",
    "settings.patternDetection": "Pattern Detection",
    "settings.about": "About",
    "settings.privacyPolicy": "Privacy Policy",
    "settings.faq": "FAQ",
    "settings.dataControl": "Your data, your control",
    "settings.dataControlDesc":
      "Manage privacy, backup data, or delete your account anytime. PDP compliant.",
    "settings.version": "HealthyU v1.0",
    // Preferences page
    "prefs.title": "Preferences",
    "prefs.subtitle": "Customize appearance & units",
    "prefs.loading": "Loading preferences\u2026",
    "prefs.error": "Failed to load preferences",
    "prefs.retry": "Try again",
    "prefs.unitLabel": "Measurement Unit",
    "prefs.unitDesc": "For weight & height",
    "prefs.languageLabel": "Language",
    "prefs.languageDesc": "App interface",
    "prefs.themeLabel": "Theme",
    "prefs.themeDesc": "Light/dark appearance",
    "prefs.timezoneLabel": "Timezone",
    "prefs.timezoneDesc": "For prayer times & reminders",
    "prefs.saved": "Saved",
    "prefs.syncNote": "Preferences are saved to your account and synced across devices.",
    // Chat settings page
    "chat.title": "Chat Settings",
    "chat.subtitle": "Retention & privacy",
    "chat.loading": "Loading\u2026",
    "chat.error": "Failed to load",
    "chat.retry": "Try again",
    "chat.retentionTitle": "Auto Chat Retention",
    "chat.retentionDesc": "Choose how long your chats are kept.",
    "chat.currently": "Currently",
    "chat.save": "Save",
    "chat.saving": "Saving\u2026",
    "chat.deleteTitle": "Delete all chats now",
    "chat.deleteDesc": "Permanently delete your entire chat history. This cannot be undone.",
    "chat.deleteBtn": "Delete all chats",
    "chat.deleting": "Deleting\u2026",
    "chat.saved": "Retention settings saved",
    "chat.retentionFootnote":
      "Retention period: {min}\u2013{max} days (10 years). PDP 2022 compliance.",
    // Common
    "common.back": "Back",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
  },
} satisfies Record<string, TranslationBundle>;

export type Locale = keyof typeof bundles;
export const defaultLocale: Locale = "id";
// eslint-disable-next-line react-refresh/only-export-components
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
        /* SSR / privacy mode */
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
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocale() {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
}

// eslint-disable-next-line react-refresh/only-export-components
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
