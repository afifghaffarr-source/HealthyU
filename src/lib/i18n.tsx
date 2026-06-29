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
 * Comprehensive i18n resource bundle — SOURCE OF TRUTH for all translations.
 * Organised by feature area.  Callers use `useTranslation()` instead of
 * importing constants directly.  Compile-time constants act as fallbacks.
 *
 * Total keys: 270+
 */
export type TranslationKey =
  // ── PDF reports ─────────────────────────────────────────────────
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

  // ── Navigation ──────────────────────────────────────────────────
  | "nav.home"
  | "nav.scan"
  | "nav.fasting"
  | "nav.workout"
  | "nav.coach"
  | "nav.profile"
  | "nav.database"
  | "nav.foods"
  | "nav.main"

  // ── Common / Shared ─────────────────────────────────────────────
  | "common.back"
  | "common.save"
  | "common.cancel"
  | "common.confirm"
  | "common.loading"
  | "common.searching"
  | "common.error"
  | "common.retry"
  | "common.delete"
  | "common.deleted"
  | "common.logged"
  | "common.sending"
  | "common.saved"
  | "common.history"
  | "common.all"
  | "common.total"
  | "common.viewAll"
  | "common.seeAll"
  | "common.detail"
  | "common.open"
  | "common.close"
  | "common.closeTip"
  | "common.closeNotif"
  | "common.add"
  | "common.home"
  | "common.tryAgain"
  | "common.noData"
  | "common.offlineMessage"
  | "common.offlineSaved"
  | "common.unknownProduct"
  | "common.defaultName"

  // ── Settings ────────────────────────────────────────────────────
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

  // ── Preferences ─────────────────────────────────────────────────
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

  // ── Chat Settings ───────────────────────────────────────────────
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

  // ── Dashboard ───────────────────────────────────────────────────
  | "dashboard.coachmark.title"
  | "dashboard.coachmark.description"
  | "dashboard.today"
  | "dashboard.detail"
  | "dashboard.quickActions"
  | "dashboard.nextStep"
  | "dashboard.metaPatternDetected"
  | "dashboard.viewAll"
  | "dashboard.achievement"
  | "dashboard.seeAll"
  | "dashboard.weeklySummary"
  | "dashboard.weeklyDigest.title"
  | "dashboard.weeklyDigest.description"
  | "dashboard.weeklyDigest.sending"
  | "dashboard.weeklyDigest.resend"
  | "dashboard.weeklyDigest.send"
  | "dashboard.weeklyDigest.sent"
  | "dashboard.weeklyDigest.info"
  | "dashboard.weeklyDigest.notProcessed"
  | "dashboard.aiCoach"
  | "dashboard.open"
  | "dashboard.patternInsights"
  | "dashboard.tracking"
  | "dashboard.hide"
  | "dashboard.seeAllSections"
  | "dashboard.insight"
  | "dashboard.checkIn"
  | "dashboard.motivation"
  | "dashboard.others"
  | "dashboard.mealsToday"
  | "dashboard.greeting"
  | "dashboard.eyebrow.bonus"

  // ── Fasting ─────────────────────────────────────────────────────
  | "fasting.title"
  | "fasting.subtitle"
  | "fasting.scheduleSaved"
  | "fasting.startedToast"
  | "fasting.completedToast"
  | "fasting.stoppedToast"
  | "fasting.streakLabel"
  | "fasting.longest"
  | "fasting.thisWeek"
  | "fasting.countUnit"
  | "fasting.protocol"
  | "fasting.targetHours"
  | "fasting.hydrationTip"
  | "fasting.endNow"
  | "fasting.breakFast.title"
  | "fasting.breakFast.desc"
  | "fasting.breakFast.tip1"
  | "fasting.breakFast.tip2"
  | "fasting.breakFast.tip3"
  | "fasting.breakFast.motivation"
  | "fasting.protocols.label"
  | "fasting.customDuration"
  | "fasting.startCustom"
  | "fasting.longFastConfirm.title"
  | "fasting.longFastConfirm.desc"
  | "fasting.longFastConfirm.agree"
  | "fasting.ramadhan.label"
  | "fasting.ramadhan.desc"
  | "fasting.imsak"
  | "fasting.iftar"
  | "fasting.saveSchedule"
  | "fasting.phases.title"
  | "fasting.phases.subtitle"
  | "fasting.phases.hydrationReminder"
  | "fasting.phases.fedState"
  | "fasting.phases.fedStateDesc"
  | "fasting.phases.glycogenDepletion"
  | "fasting.phases.glycogenDepletionDesc"
  | "fasting.phases.fatBurning"
  | "fasting.phases.fatBurningDesc"
  | "fasting.safeFasting.label"
  | "fasting.towardIftar"
  | "fasting.elapsedTarget"

  // ── Workout ─────────────────────────────────────────────────────
  | "workout.title"
  | "workout.subtitle" // "{n} sesi · {m} menit · {c} kcal"
  | "workout.type.cardio"
  | "workout.type.strength"
  | "workout.type.hiit"
  | "workout.type.yoga"
  | "workout.type.walking"
  | "workout.type.cycling"
  | "workout.programs"
  | "workout.progress"
  | "workout.logNew"
  | "workout.namePlaceholder"
  | "workout.duration"
  | "workout.calories"
  | "workout.intensity.low"
  | "workout.intensity.medium"
  | "workout.intensity.high"
  | "workout.saveSession"
  | "workout.empty"
  | "workout.offlineSaved"
  | "workout.logged"
  | "workout.activeSession"
  | "workout.started"
  | "workout.sessionUnit"
  | "workout.sync" // "Sync {pending}"

  // ── Water / Hydration ───────────────────────────────────────────
  | "water.title"
  | "water.target"
  | "water.today"
  | "water.progress"
  | "water.addQuick"
  | "water.lastWeek"
  | "water.todayEntries"
  | "water.empty"
  | "water.logged"
  | "water.offlineSaved"
  | "water.mlUnit"

  // ── Meals / Food ────────────────────────────────────────────────
  | "meals.title"
  | "meals.subtitle"
  | "meals.type.breakfast"
  | "meals.type.lunch"
  | "meals.type.dinner"
  | "meals.type.snack"
  | "meals.empty"
  | "meals.emptyHint"
  | "meals.scanFood"
  | "meals.addManual"
  | "meals.nlPlaceholder"
  | "meals.logged"
  | "meals.offlineSaved"
  | "meals.parseLabel"

  // ── Food Database ───────────────────────────────────────────────
  | "foods.dbTitle"
  | "foods.searchPlaceholder"
  | "foods.recentSearch"
  | "foods.region"
  | "foods.category"
  | "foods.tag"
  | "foods.avoidAllergen"
  | "foods.noResults"
  | "foods.loadMore"
  | "foods.reset"
  | "foods.resultCount"

  // ── Scan ────────────────────────────────────────────────────────
  | "scan.barcode.title"
  | "scan.barcode.notFound"
  | "scan.barcode.cameraError"
  | "scan.barcode.searching"
  | "scan.barcode.codeLabel"
  | "scan.barcode.portion"
  | "scan.barcode.logKcal"
  | "scan.barcodeLive.title"
  | "scan.barcodeLive.startHint"
  | "scan.barcodeLive.browserNotSupported"
  | "scan.barcodeLive.useManual"
  | "scan.barcodeLive.manualPlaceholder"
  | "scan.barcodeLive.detected"
  | "scan.barcodeLive.searchProduct"
  | "scan.barcodeLive.stopScan"
  | "scan.barcodeLive.startScan"
  | "scan.nutrition.calories"
  | "scan.nutrition.protein"
  | "scan.nutrition.carbs"
  | "scan.nutrition.fat"
  | "scan.allergens"
  | "scan.voice.title"
  | "scan.voice.browserNotSupported"
  | "scan.voice.listening"
  | "scan.voice.pressToTalk"
  | "scan.voice.example"
  | "scan.voice.typeManual"
  | "scan.voice.analyze"
  | "scan.voice.detected"
  | "scan.voice.notRecognized"

  // ── Scan Food Photo ──────────────────────────────────────────
  | "scan.foodPhoto.title"
  | "scan.foodPhoto.tip"
  | "scan.foodPhoto.ctaTitle"
  | "scan.foodPhoto.ctaDesc"
  | "scan.foodPhoto.choosePhoto"
  | "scan.history"
  | "scan.limitReached"
  | "scan.processError"
  | "scan.aiMode"
  | "scan.modeAccurate"
  | "scan.modeFast"
  | "scan.switchModeFast"
  | "scan.switchModeAccurate"
  | "scan.useFast"
  | "scan.useAccurate"
  | "scan.accurateDesc"
  | "scan.fastDesc"
  | "scan.analyzing"
  | "scan.canReview"
  | "scan.scanError"
  | "scan.retryHint"
  | "scan.notClear"
  | "scan.notClearHint"
  | "scan.rescan"
  | "scan.addManual"

  // ── Profile ─────────────────────────────────────────────────────
  | "profile.title"
  | "profile.defaultName"
  | "profile.edit"
  | "profile.loading"
  | "profile.bmi"
  | "profile.activity"
  | "profile.weightTarget"
  | "profile.dailyCalories"
  | "profile.quickActions"
  | "profile.scanLabel"
  | "profile.scanDesc"
  | "profile.coachLabel"
  | "profile.coachDesc"
  | "profile.recipesLabel"
  | "profile.recipesDesc"
  | "profile.recipes"
  | "profile.recipesSaved"
  | "profile.exploreRecipes"
  | "profile.moreFeatures"
  | "profile.settingsSubtitle"
  | "profile.settingsLabel"
  | "profile.settingsDesc"
  | "profile.logout"
  | "profile.logoutConfirm"
  | "profile.logoutConfirmDesc"
  | "profile.logoutConfirmYes"
  | "profile.logoutDesc"
  | "profile.logoutYes"

  // ── Reports ─────────────────────────────────────────────────────
  | "reports.weekly.title"
  | "reports.generating"
  | "reports.calculatingCarbon"
  | "reports.calculatingWeek"
  | "reports.shareCard.title"
  | "reports.shareCard.share"
  | "reports.shareCard.sharing"
  | "reports.shareCard.success"
  | "reports.shareCard.cancelled"
  | "reports.shareCard.failed"
  | "reports.stat.calPerDay"
  | "reports.stat.workout"
  | "reports.stat.waterPerDay"
  | "reports.stat.activeDays"
  | "reports.stat.activityScore"
  | "reports.title"
  | "reports.subtitle"
  | "reports.stat.totalCalIn"
  | "reports.stat.burn"
  | "reports.stat.totalWater"
  | "reports.stat.totalSleep"
  | "reports.stat.fastingDone"
  | "reports.unit.kcal"
  | "reports.unit.liter"
  | "reports.unit.hours"
  | "reports.generateError"
  | "reports.announceGenerated"
  | "reports.announceGenerateError"
  | "reports.latest"

  // ── Vitals ──────────────────────────────────────────────────────
  | "vitals.title"
  | "vitals.offlineSaved"
  | "vitals.logged"

  // ── Mood ────────────────────────────────────────────────────────
  | "mood.title"
  | "mood.subtitle"
  | "mood.avgLabel"
  | "mood.empty"
  | "mood.emptyHint"
  | "mood.logged"
  | "mood.offlineSaved"
  | "mood.heatmap.title"

  // ── Sleep ───────────────────────────────────────────────────────
  | "sleep.title"
  | "sleep.avg7Days"
  | "sleep.quality"
  | "sleep.trend"
  | "sleep.log"
  | "sleep.sleepStart"
  | "sleep.wakeUp"
  | "sleep.empty"
  | "sleep.logged"
  | "sleep.hourUnit"

  // ── Weight ──────────────────────────────────────────────────────
  | "weight.title"
  | "weight.current"
  | "weight.target"
  | "weight.change.unchanged"
  | "weight.change.sinceStart"
  | "weight.logToday"
  | "weight.notePlaceholder"
  | "weight.trend"
  | "weight.empty"
  | "weight.emptyHint"
  | "weight.logged"
  | "weight.offlineSaved"

  // ── Prayer ──────────────────────────────────────────────────────
  | "prayer.title"
  | "prayer.source"
  | "prayer.names.fajr"
  | "prayer.names.dhuhr"
  | "prayer.names.asr"
  | "prayer.names.maghrib"
  | "prayer.names.isha"
  | "prayer.notifOn"
  | "prayer.notifOff"

  // ── Community ───────────────────────────────────────────────────
  | "community.title"
  | "community.subtitle"
  | "community.stats.posts"
  | "community.stats.likes"
  | "community.stats.active"
  | "community.sort.newest"
  | "community.sort.popular"
  | "community.empty"
  | "community.posted"

  // ── Reminders ───────────────────────────────────────────────────
  | "reminders.title"
  | "reminders.enableNotif"
  | "reminders.notifActive"
  | "reminders.pwaHint"
  | "reminders.browserNotSupported"
  | "reminders.notifEnabled"
  | "reminders.notifDenied"
  | "reminders.notifReady"
  | "reminders.enterName"
  | "reminders.added"
  | "reminders.addLabel"

  // ── Onboarding ──────────────────────────────────────────────────
  | "onboarding.profileSaved"

  // ── Hijri / Calendar ───────────────────────────────────────────
  | "hijri.label"
  | "hijri.ramadhanCountdown"
  | "hijri.daysLeft"
  | "hijri.towardRamadhan"
  | "hijri.todayRamadhan"
  | "hijri.featureTitle"

  // ── Offline / Sync ──────────────────────────────────────────────
  | "offline.mode"
  | "offline.pendingCount"
  | "offline.noPending"
  | "offline.failedLabel"
  | "offline.cleaned"
  | "offline.deleteAll"
  | "offline.noFailed"
  | "offline.resent"
  | "offline.syncNow"
  | "offline.queueTitle"
  | "offline.queueSubtitle"
  | "offline.waitingSync"
  | "offline.kind.hydration"
  | "offline.kind.weight"
  | "offline.kind.meal"
  | "offline.kind.mood"
  | "offline.kind.vitals"
  | "offline.kind.workout"
  | "offline.banner.offline"
  | "offline.banner.offlinePending"
  | "offline.banner.pending"
  | "offline.band.modeOffline"
  | "offline.band.entriesWaiting"
  | "offline.band.sync"
  | "offline.band.deleteFailed"
  | "offline.band.noStuck"
  | "offline.band.deletedCount"
  | "offline.purgeConfirm"

  // ── PWA / Service Worker ────────────────────────────────────────
  | "pwa.updateAvailable"
  | "pwa.offlineReady"
  | "pwa.updateDesc"
  | "pwa.offlineDesc"
  | "pwa.reload"
  | "pwa.dismiss"

  // ── Coach ──────────────────────────────────────────────────────
  | "coach.title"
  | "coach.subtitle"
  | "coach.generateError"
  | "coach.loadError"
  | "coach.refresh"
  | "coach.analyzingMorning"
  | "coach.analyzingEvening"
  | "coach.historyLabel"
  | "coach.noHistory"
  | "coach.morningGreeting"
  | "coach.todayFocus"
  | "coach.lastWeekSummary"
  | "coach.todayTips"
  | "coach.warnings"
  | "coach.generatedAt"
  | "coach.eveningReflection"
  | "coach.todayWins"
  | "coach.forTomorrow"
  | "coach.tomorrowFocus"
  | "coach.tonightTips"
  | "coach.morning"
  | "coach.evening"
  | "coach.read"
  | "coach.new"

  // ── Error / Not Found ───────────────────────────────────────────
  | "error.notFound.title"
  | "error.notFound.desc"
  | "error.notFound.backHome"
  | "error.pageFailed.title"
  | "error.pageFailed.desc"
  | "error.pageFailed.home"
  | "error.featureBroken"
  | "error.featureBrokenDesc"

  // ── Privacy / Data ──────────────────────────────────────────────
  | "privacy.title"
  | "privacy.improveAI"
  | "privacy.improveAIDesc"
  | "privacy.autoRedact"
  | "privacy.autoRedactDesc"
  | "privacy.downloadData"
  | "privacy.downloadDataDesc"
  | "privacy.policyDesc"
  | "privacy.notFound"

  // ── Sustainability ──────────────────────────────────────────────
  | "sustainability.calculatingCarbon"
  | "sustainability.noData";

/** Template string `{page}` → page number. */
export type TranslationBundle = Record<TranslationKey, string>;

// eslint-disable-next-line react-refresh/only-export-components
export const bundles = {
  // ══════════════════════════════════════════════════════════════════
  //  INDONESIAN (id)
  // ══════════════════════════════════════════════════════════════════
  id: {
    // ── PDF reports ───────────────────────────────────────────────
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

    // ── Navigation ────────────────────────────────────────────────
    "nav.home": "Beranda",
    "nav.scan": "Scan",
    "nav.fasting": "Puasa",
    "nav.workout": "Latihan",
    "nav.coach": "AI Coach",
    "nav.profile": "Saya",
    "nav.database": "Database",
    "nav.foods": "Makanan",
    "nav.main": "Navigasi utama",

    // ── Common / Shared ───────────────────────────────────────────
    "common.back": "Kembali",
    "common.save": "Simpan",
    "common.cancel": "Batal",
    "common.confirm": "Konfirmasi",
    "common.loading": "Memuat\u2026",
    "common.searching": "Mencari\u2026",
    "common.error": "Gagal",
    "common.retry": "Coba lagi",
    "common.delete": "Hapus",
    "common.deleted": "Dihapus",
    "common.logged": "Dicatat",
    "common.sending": "Mengirim\u2026",
    "common.saved": "Tersimpan",
    "common.history": "Riwayat",
    "common.all": "Semua",
    "common.total": "Total",
    "common.viewAll": "Lihat semua",
    "common.seeAll": "Semua",
    "common.detail": "Detail",
    "common.open": "Buka",
    "common.close": "Tutup",
    "common.closeTip": "Tutup tip",
    "common.closeNotif": "Tutup notifikasi",
    "common.add": "Tambah",
    "common.home": "Beranda",
    "common.tryAgain": "Coba lagi",
    "common.noData": "Belum ada data",
    "common.offlineMessage": "Tidak ada koneksi internet",
    "common.offlineSaved": "disimpan offline. Akan sync otomatis.",
    "common.unknownProduct": "Tanpa nama",
    "common.defaultName": "Sahabat",

    // ── Settings ──────────────────────────────────────────────────
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

    // ── Preferences ───────────────────────────────────────────────
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

    // ── Chat Settings ─────────────────────────────────────────────
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

    // ── Dashboard ─────────────────────────────────────────────────
    "dashboard.coachmark.title": "Selamat datang di Healthy U",
    "dashboard.coachmark.description":
      "Geser ke bawah untuk refresh, ketuk kartu untuk catat aktivitas, dan kunjungi Profil untuk personalisasi.",
    "dashboard.today": "Hari Ini",
    "dashboard.detail": "Detail",
    "dashboard.quickActions": "Aksi Cepat",
    "dashboard.nextStep": "Langkah Berikutnya",
    "dashboard.metaPatternDetected": "\u26A0\uFE0F Pola Penting Terdeteksi",
    "dashboard.viewAll": "Lihat semua",
    "dashboard.achievement": "\uD83C\uDF96 Achievement",
    "dashboard.seeAll": "Semua",
    "dashboard.weeklySummary": "\uD83D\uDCCA Ringkasan Mingguan",
    "dashboard.weeklyDigest.title": "Kirim Ringkasan Minggu Ini",
    "dashboard.weeklyDigest.description":
      "Dapatkan top 3 pola makan 7 hari terakhir langsung ke email kamu.",
    "dashboard.weeklyDigest.sending": "Mengirim...",
    "dashboard.weeklyDigest.resend": "\u2713 Kirim ulang",
    "dashboard.weeklyDigest.send": "\uD83D\uDCE7 Kirim ke Email",
    "dashboard.weeklyDigest.sent": "\u2713 Terkirim ({count} pola)",
    "dashboard.weeklyDigest.info": "Info: {reason}",
    "dashboard.weeklyDigest.notProcessed": "belum diproses",
    "dashboard.aiCoach": "AI Coach",
    "dashboard.open": "Buka",
    "dashboard.patternInsights": "Pattern Insights",
    "dashboard.tracking": "Tracking",
    "dashboard.hide": "Sembunyikan",
    "dashboard.seeAllSections": "Lihat Semua",
    "dashboard.insight": "Insight",
    "dashboard.checkIn": "Check-In",
    "dashboard.motivation": "Motivasi",
    "dashboard.others": "Lainnya",
    "dashboard.mealsToday": "Makanan Hari Ini",
    "dashboard.greeting": "Halo, {name}!",
    "dashboard.eyebrow.bonus": "Bonus",

    // ── Coach ────────────────────────────────────────────────────
    "coach.title": "AI Coach",
    "coach.subtitle": "Personalisasi dari data 7 hari kamu",
    "coach.generateError": "Gagal generate coach",
    "coach.loadError": "Gagal memuat coach",
    "coach.refresh": "Refresh coach",
    "coach.analyzingMorning": "AI sedang menganalisis data Anda\u2026",
    "coach.analyzingEvening": "AI sedang menyiapkan refleksi malam\u2026",
    "coach.historyLabel": "Riwayat Coach (7 hari)",
    "coach.noHistory": "Belum ada riwayat coach.",
    "coach.morningGreeting": "Sapaan Pagi",
    "coach.todayFocus": "Fokus Hari Ini",
    "coach.lastWeekSummary": "Ringkasan Minggu Lalu",
    "coach.todayTips": "Tips Hari Ini",
    "coach.warnings": "Perhatian",
    "coach.generatedAt": "Dibuat {date} \u2022 Bukan saran medis",
    "coach.eveningReflection": "Refleksi Malam",
    "coach.todayWins": "Pencapaian Hari Ini",
    "coach.forTomorrow": "Untuk Besok",
    "coach.tomorrowFocus": "Fokus Besok",
    "coach.tonightTips": "Tips Malam Ini",
    "coach.morning": "Pagi",
    "coach.evening": "Malam",
    "coach.read": "\u2713 dibaca",
    "coach.new": "baru",

    // ── Fasting ───────────────────────────────────────────────────
    "fasting.title": "Puasa",
    "fasting.subtitle": "Atur protokol & jadwal",
    "fasting.scheduleSaved": "Jadwal tersimpan",
    "fasting.startedToast": "Puasa dimulai. Semangat!",
    "fasting.completedToast": "Selamat! Puasa tercapai \uD83C\uDF89",
    "fasting.stoppedToast": "Puasa dihentikan",
    "fasting.streakLabel": "Streak puasa berturut-turut \uD83D\uDD25",
    "fasting.longest": "Terlama",
    "fasting.thisWeek": "Minggu ini",
    "fasting.countUnit": "puasa",
    "fasting.protocol": "Protokol {protocol}",
    "fasting.targetHours": "Target: {target} jam",
    "fasting.hydrationTip": "Ingat minum air ya \u2014 hidrasi bantu tubuh tetap nyaman.",
    "fasting.endNow": "Selesai untuk sekarang",
    "fasting.breakFast.title": "Break fast bijak",
    "fasting.breakFast.desc": "Setelah puasa, beri tubuh waktu menyesuaikan.",
    "fasting.breakFast.tip1": "Mulai dengan minum air hangat dulu.",
    "fasting.breakFast.tip2": "Pilih makanan ringan: buah, kurma, atau sup hangat.",
    "fasting.breakFast.tip3": "Makan pelan-pelan, hindari langsung porsi besar.",
    "fasting.breakFast.motivation": "Progress kecil tetap progress.",
    "fasting.protocols.label": "Pilih protokol",
    "fasting.customDuration": "Durasi kustom",
    "fasting.startCustom": "Mulai puasa {hours} jam",
    "fasting.longFastConfirm.title": "Puasa lebih dari 16 jam",
    "fasting.longFastConfirm.desc":
      "Puasa panjang tidak disarankan untuk ibu hamil/menyusui, remaja, atau yang punya riwayat gangguan makan, diabetes, atau kondisi medis lain. Pastikan kamu cukup hidrasi & berhenti kapan saja jika tidak nyaman.",
    "fasting.longFastConfirm.agree": "Saya mengerti, mulai",
    "fasting.ramadhan.label": "Mode Ramadhan",
    "fasting.ramadhan.desc": "Jadwal puasa berulang harian",
    "fasting.imsak": "Imsak",
    "fasting.iftar": "Berbuka",
    "fasting.saveSchedule": "Simpan jadwal",
    "fasting.phases.title": "Fase puasa",
    "fasting.phases.subtitle": "Apa yang terjadi saat kamu puasa (panduan umum, bukan medis)",
    "fasting.phases.hydrationReminder":
      "\uD83D\uDCA7 Tetap minum air putih selama puasa. Dehidrasi bukan tujuan.",
    "fasting.phases.fedState": "Fed state",
    "fasting.phases.fedStateDesc": "Tubuh pakai glukosa dari makanan sebagai energi utama.",
    "fasting.phases.glycogenDepletion": "Glycogen depletion",
    "fasting.phases.glycogenDepletionDesc":
      "Cadangan glikogen mulai habis, tubuh beralih ke lemak.",
    "fasting.phases.fatBurning": "Fat burning",
    "fasting.phases.fatBurningDesc":
      "Tubuh bakar lemak jadi energi (ketosis ringan). Ini fase yang umumnya dicari.",
    "fasting.safeFasting.label": "Puasa Aman",
    "fasting.towardIftar": "Menuju Berbuka",
    "fasting.elapsedTarget": "Berjalan {elapsed}j \u00B7 target {target}j",

    // ── Workout ───────────────────────────────────────────────────
    "workout.title": "Latihan",
    "workout.subtitle": "{sessions} sesi \u00B7 {minutes} menit \u00B7 {cal} kcal",
    "workout.type.cardio": "Kardio",
    "workout.type.strength": "Strength",
    "workout.type.hiit": "HIIT",
    "workout.type.yoga": "Yoga",
    "workout.type.walking": "Jalan",
    "workout.type.cycling": "Sepeda",
    "workout.programs": "Program",
    "workout.progress": "Progress",
    "workout.logNew": "Catat sesi baru",
    "workout.namePlaceholder": "Nama (mis. Lari pagi)",
    "workout.duration": "Durasi (min)",
    "workout.calories": "Kalori",
    "workout.intensity.low": "Ringan",
    "workout.intensity.medium": "Sedang",
    "workout.intensity.high": "Berat",
    "workout.saveSession": "Simpan sesi",
    "workout.empty": "Belum ada sesi tercatat",
    "workout.offlineSaved": "Latihan disimpan offline. Akan sync otomatis.",
    "workout.logged": "Latihan dicatat",
    "workout.activeSession": "Sesi Aktif",
    "workout.started": "Dimulai",
    "workout.sessionUnit": "sesi",
    "workout.sync": "Sync {pending}",

    // ── Water / Hydration ─────────────────────────────────────────
    "water.title": "Hidrasi",
    "water.target": "Target {ml} ml / hari",
    "water.today": "Hari ini",
    "water.progress": "{pct}% dari target",
    "water.addQuick": "Tambah cepat",
    "water.lastWeek": "7 hari terakhir",
    "water.todayEntries": "Catatan hari ini",
    "water.empty": "Belum ada catatan. Tekan tombol di atas untuk menambah.",
    "water.logged": "+{ml}ml dicatat",
    "water.offlineSaved": "+{ml}ml disimpan offline. Akan sync otomatis.",
    "water.mlUnit": "ml",

    // ── Meals / Food ──────────────────────────────────────────────
    "meals.title": "Catat makanan",
    "meals.subtitle": "Cari, scan, atau bicarakan",
    "meals.type.breakfast": "Sarapan",
    "meals.type.lunch": "Makan Siang",
    "meals.type.dinner": "Makan Malam",
    "meals.type.snack": "Camilan",
    "meals.empty": "Belum ada makanan hari ini.",
    "meals.emptyHint": "Mulai dengan scan makanan atau tambah manual.",
    "meals.scanFood": "Scan makanan",
    "meals.addManual": "Tambah manual",
    "meals.nlPlaceholder": 'Contoh: "nasi padang ayam bakar setengah porsi"',
    "meals.logged": "Makanan dicatat",
    "meals.offlineSaved": "Makanan disimpan offline. Akan sync otomatis.",
    "meals.parseLabel": "Parse makanan",

    // ── Food Database ─────────────────────────────────────────────
    "foods.dbTitle": "Database Makanan",
    "foods.searchPlaceholder": "Cari nasi, ayam, sate...",
    "foods.recentSearch": "Pencarian terakhir",
    "foods.region": "Daerah",
    "foods.category": "Kategori",
    "foods.tag": "Tag",
    "foods.avoidAllergen": "Hindari alergen",
    "foods.noResults": "Tidak ada hasil.",
    "foods.loadMore": "Muat Lebih Banyak",
    "foods.reset": "Reset",
    "foods.resultCount": "{count} makanan",

    // ── Scan ──────────────────────────────────────────────────────
    "scan.barcode.title": "Scan Barcode",
    "scan.barcode.notFound": "Produk tidak ditemukan di Open Food Facts",
    "scan.barcode.cameraError": "Tidak bisa akses kamera",
    "scan.barcode.searching": "Mencari produk\u2026",
    "scan.barcode.codeLabel": "Kode: {code}",
    "scan.barcode.portion": "Porsi (gram)",
    "scan.barcode.logKcal": "Catat {kcal} kkal",
    "scan.barcodeLive.title": "Barcode Scanner",
    "scan.barcodeLive.startHint": 'Tap "Mulai Scan" untuk aktifkan kamera',
    "scan.barcodeLive.browserNotSupported": "Browser tidak mendukung BarcodeDetector",
    "scan.barcodeLive.useManual": "Browser tidak mendukung BarcodeDetector. Gunakan input manual.",
    "scan.barcodeLive.manualPlaceholder": "Atau ketik barcode manual",
    "scan.barcodeLive.detected": "Terdeteksi: {code}",
    "scan.barcodeLive.searchProduct": "Cari Produk",
    "scan.barcodeLive.stopScan": "Stop Scan",
    "scan.barcodeLive.startScan": "Mulai Scan",
    "scan.nutrition.calories": "Kalori",
    "scan.nutrition.protein": "Protein",
    "scan.nutrition.carbs": "Karbo",
    "scan.nutrition.fat": "Lemak",
    "scan.allergens": "\u26A0\uFE0F Alergen: {allergens}",
    "scan.voice.title": "Catat via Suara",
    "scan.voice.browserNotSupported":
      "Browser tidak mendukung speech recognition. Coba Chrome/Edge.",
    "scan.voice.listening": "Mendengarkan\u2026 ucapkan apa yang Anda makan",
    "scan.voice.pressToTalk": "Tekan untuk mulai bicara",
    "scan.voice.example": 'Contoh: "Saya makan nasi goreng setengah piring dan es teh manis"',
    "scan.voice.typeManual": "Atau ketik manual\u2026",
    "scan.voice.analyze": "Analisa dengan AI",
    "scan.voice.detected": "Terdeteksi",
    "scan.voice.notRecognized": "Tidak ada makanan dikenali",

    // ── Scan Food Photo ──────────────────────────────────────────
    "scan.foodPhoto.title": "Scan Makanan",
    "scan.foodPhoto.tip":
      "\uD83D\uDCA1 Tip: sertakan referensi (sendok, garpu, atau tangan) di foto agar estimasi porsi lebih akurat.",
    "scan.foodPhoto.ctaTitle": "Foto makananmu",
    "scan.foodPhoto.ctaDesc":
      "AI memperkirakan nama, porsi, & kalori \u2014 kamu bisa ubah sebelum simpan",
    "scan.foodPhoto.choosePhoto": "Ambil / Pilih Foto",
    "scan.history": "Riwayat scan",
    "scan.limitReached": "Limit harian {limit} scan. Upgrade Pro untuk unlimited.",
    "scan.processError": "Gagal memproses gambar",
    "scan.aiMode": "Mode AI: ",
    "scan.modeAccurate": "Akurat (lebih lambat)",
    "scan.modeFast": "Cepat",
    "scan.switchModeFast": "Beralih ke mode cepat",
    "scan.switchModeAccurate": "Beralih ke mode akurat",
    "scan.useFast": "Pakai Cepat",
    "scan.useAccurate": "Pakai Akurat",
    "scan.accurateDesc": "Akurat: sedikit lebih lama, tapi lebih teliti.",
    "scan.fastDesc": "Cepat: cocok untuk catatan harian.",
    "scan.analyzing": "Menganalisis foto\u2026",
    "scan.canReview": "Hasilnya bisa kamu cek lagi sebelum simpan.",
    "scan.scanError": "Scan belum berhasil",
    "scan.retryHint": "Coba foto ulang dengan cahaya lebih terang, atau tambah manual.",
    "scan.notClear": "Belum terbaca jelas",
    "scan.notClearHint":
      "Coba foto lebih dekat, pastikan makanan terlihat penuh, atau tambah manual.",
    "scan.rescan": "Pindai ulang",
    "scan.addManual": "Tambah manual",

    // ── Profile ───────────────────────────────────────────────────
    "profile.title": "Profil",
    "profile.defaultName": "Sahabat",
    "profile.edit": "Edit profil",
    "profile.loading": "Memuat\u2026",
    "profile.bmi": "BMI",
    "profile.activity": "Aktivitas",
    "profile.weightTarget": "Target berat",
    "profile.dailyCalories": "Kalori harian",
    "profile.quickActions": "Aksi Cepat",
    "profile.scanLabel": "Scan",
    "profile.scanDesc": "Foto, barcode, menu",
    "profile.coachLabel": "AI Coach",
    "profile.coachDesc": "Tanya & insight",
    "profile.recipesLabel": "Resep",
    "profile.recipesDesc": "Yang lo simpan",
    "profile.recipes": "Resep",
    "profile.recipesSaved": "Yang lo simpan",
    "profile.exploreRecipes": "Jelajahi semua resep",
    "profile.moreFeatures": "Fitur Lainnya",
    "profile.settingsSubtitle": "Akun, privasi, preferensi, notifikasi",
    "profile.settingsLabel": "Pengaturan",
    "profile.settingsDesc": "Akun, privasi, preferensi, notifikasi",
    "profile.logout": "Keluar dari akun",
    "profile.logoutConfirm": "Keluar dari HealthyU?",
    "profile.logoutConfirmDesc":
      "Kamu akan keluar dari akun ini. Data tetap aman dan bisa diakses lagi saat masuk kembali.",
    "profile.logoutConfirmYes": "Ya, keluar",
    "profile.logoutDesc":
      "Kamu akan keluar dari akun ini. Data tetap aman dan bisa diakses lagi saat masuk kembali.",
    "profile.logoutYes": "Ya, keluar",

    // ── Reports ───────────────────────────────────────────────────
    "reports.weekly.title": "Laporan Mingguan AI",
    "reports.generating": "Menyusun ringkasan AI\u2026",
    "reports.calculatingCarbon": "Menghitung jejak karbon\u2026",
    "reports.calculatingWeek": "Menghitung minggu\u2026",
    "reports.shareCard.title": "Kartu Minggu \u2014 Shareable",
    "reports.shareCard.share": "Bagikan Kartu",
    "reports.shareCard.sharing": "Menyusun\u2026",
    "reports.shareCard.success": "Berhasil dibagikan ({via})",
    "reports.shareCard.cancelled": "Dibatalkan",
    "reports.shareCard.failed": "Gagal membagikan",
    "reports.stat.calPerDay": "Kalori/hari",
    "reports.stat.workout": "Latihan",
    "reports.stat.waterPerDay": "Air/hari",
    "reports.stat.activeDays": "Hari aktif",
    "reports.stat.activityScore": "{score}/100 aktivitas",
    "reports.title": "Laporan 7 Hari",
    "reports.subtitle": "Ringkasan kesehatan mingguan",
    "reports.stat.totalCalIn": "Total kalori masuk",
    "reports.stat.burn": "Kalori terbakar",
    "reports.stat.totalWater": "Total air",
    "reports.stat.totalSleep": "Total tidur",
    "reports.stat.fastingDone": "Puasa selesai",
    "reports.unit.kcal": "kcal",
    "reports.unit.liter": "liter",
    "reports.unit.hours": "jam",
    "reports.generateError": "Gagal generate",
    "reports.announceGenerated": "Laporan {periode} baru di-generate",
    "reports.announceGenerateError": "Gagal generate laporan: {msg}",
    "reports.latest": "terbaru",

    // ── Vitals ────────────────────────────────────────────────────
    "vitals.title": "Vital Signs",
    "vitals.offlineSaved": "Vitals disimpan offline. Akan sync otomatis.",
    "vitals.logged": "Vital signs tercatat",

    // ── Mood ──────────────────────────────────────────────────────
    "mood.title": "Mood & Jurnal",
    "mood.subtitle": "Catat perasaanmu hari ini",
    "mood.avgLabel": "Rata-rata 30 hari: {avg} / 5",
    "mood.empty": "Belum ada catatan mood",
    "mood.emptyHint": "Pilih emoji di atas untuk mencatat perasaanmu hari ini.",
    "mood.logged": "Mood tercatat",
    "mood.offlineSaved": "Mood disimpan offline. Akan sync otomatis.",
    "mood.heatmap.title": "Mood Heatmap Tahunan",

    // ── Sleep ─────────────────────────────────────────────────────
    "sleep.title": "Tidur",
    "sleep.avg7Days": "Rata-rata 7 hari",
    "sleep.quality": "Kualitas",
    "sleep.trend": "Tren 7 hari",
    "sleep.log": "Catat tidur",
    "sleep.sleepStart": "Mulai tidur",
    "sleep.wakeUp": "Bangun",
    "sleep.empty": "Belum ada catatan",
    "sleep.logged": "Tidur dicatat",
    "sleep.hourUnit": "j",

    // ── Weight ────────────────────────────────────────────────────
    "weight.title": "Berat Badan",
    "weight.current": "Sekarang",
    "weight.target": "Target",
    "weight.change.unchanged": "Tidak berubah",
    "weight.change.sinceStart": "{delta} kg sejak awal",
    "weight.logToday": "Catat berat hari ini",
    "weight.notePlaceholder": "Catatan (opsional)",
    "weight.trend": "Tren ({count} catatan)",
    "weight.empty": "Belum ada catatan berat",
    "weight.emptyHint": "Catat berat badanmu untuk lacak progres",
    "weight.logged": "Berat tercatat",
    "weight.offlineSaved": "Berat disimpan offline. Akan sync otomatis.",

    // ── Prayer ────────────────────────────────────────────────────
    "prayer.title": "Jadwal Sholat",
    "prayer.source": "Sumber: Aladhan API \u00B7 Metode Kemenag RI",
    "prayer.names.fajr": "Subuh",
    "prayer.names.dhuhr": "Dzuhur",
    "prayer.names.asr": "Ashar",
    "prayer.names.maghrib": "Maghrib",
    "prayer.names.isha": "Isya",
    "prayer.notifOn": "Notifikasi sholat aktif",
    "prayer.notifOff": "Notifikasi sholat dimatikan",

    // ── Community ─────────────────────────────────────────────────
    "community.title": "Komunitas",
    "community.subtitle": "Berbagi tips & dukungan",
    "community.stats.posts": "Posts",
    "community.stats.likes": "Likes",
    "community.stats.active": "Aktif",
    "community.sort.newest": "Terbaru",
    "community.sort.popular": "Populer",
    "community.empty": "Belum ada postingan. Jadilah yang pertama!",
    "community.posted": "Posting terkirim",

    // ── Reminders ─────────────────────────────────────────────────
    "reminders.title": "Pengingat Cerdas",
    "reminders.enableNotif": "Aktifkan notifikasi",
    "reminders.notifActive": "Notifikasi aktif",
    "reminders.pwaHint":
      "Pengingat berjalan saat aplikasi terbuka. Install sebagai PWA agar tetap aktif di latar belakang.",
    "reminders.browserNotSupported": "Browser tidak mendukung notifikasi",
    "reminders.notifEnabled": "Notifikasi diaktifkan",
    "reminders.notifDenied": "Izin notifikasi ditolak",
    "reminders.notifReady": "Pengingat siap dikirim \uD83D\uDD14",
    "reminders.enterName": "Isi nama pengingat",
    "reminders.added": "Pengingat ditambahkan",
    "reminders.addLabel": "Tambah pengingat",

    // ── Onboarding ────────────────────────────────────────────────
    "onboarding.profileSaved": "Profil tersimpan!",

    // ── Hijri / Calendar ──────────────────────────────────────────
    "hijri.label": "Hijriah",
    "hijri.ramadhanCountdown": "Puasa Ramadhan",
    "hijri.daysLeft": "{days} hari lagi",
    "hijri.towardRamadhan": "hari lagi menuju Ramadhan",
    "hijri.todayRamadhan": "\uD83C\uDF19 Ramadhan 1448 H dimulai hari ini",
    "hijri.featureTitle": "Tanggal Hijriah",

    // ── Offline / Sync ────────────────────────────────────────────
    "offline.mode": "Mode offline",
    "offline.pendingCount": "{count} catatan menunggu sinkron\u2026",
    "offline.noPending": "Tidak ada item pending.",
    "offline.failedLabel": "Gagal sync",
    "offline.cleaned": "Dibersihkan",
    "offline.deleteAll": "Hapus semua",
    "offline.noFailed": "Tidak ada item gagal.",
    "offline.resent": "Dikirim ulang ke antrean",
    "offline.syncNow": "Sync sekarang ({count})",
    "offline.queueTitle": "Antrean Offline",
    "offline.queueSubtitle": "\u00B7 menunggu \u00B7 gagal",
    "offline.waitingSync": "Menunggu sync",
    "offline.kind.hydration": "Hidrasi",
    "offline.kind.weight": "Berat",
    "offline.kind.meal": "Makanan",
    "offline.kind.mood": "Mood",
    "offline.kind.vitals": "Vitals",
    "offline.kind.workout": "Latihan",
    "offline.banner.offline": "Kamu sedang offline. Catatan baru akan tersimpan lokal.",
    "offline.banner.offlinePending":
      "Offline \u00B7 {count} catatan menunggu sinkron saat koneksi kembali.",
    "offline.banner.pending": "{count} catatan menunggu sinkron\u2026",
    "offline.band.modeOffline": "Mode offline",
    "offline.band.entriesWaiting": "{count} entry menunggu sinkronisasi",
    "offline.band.sync": "Sync",
    "offline.band.deleteFailed": "Hapus yang gagal",
    "offline.band.noStuck": "Tidak ada catatan yang gagal.",
    "offline.band.deletedCount": "{count} catatan yang gagal dihapus{extra}",
    "offline.purgeConfirm":
      "Hapus semua catatan yang gagal sync > 7 hari? Tindakan ini tidak bisa dibatalkan.",

    // ── PWA / Service Worker ──────────────────────────────────────
    "pwa.updateAvailable": "Update tersedia",
    "pwa.offlineReady": "Siap dipakai offline",
    "pwa.updateDesc": "Versi baru sudah diunduh. Muat ulang untuk menerapkan.",
    "pwa.offlineDesc": "HealthyU bisa dibuka walau tanpa internet.",
    "pwa.reload": "Muat ulang",
    "pwa.dismiss": "Nanti",

    // ── Error / Not Found ─────────────────────────────────────────
    "error.notFound.title": "Halaman tidak ditemukan",
    "error.notFound.desc": "Halaman yang kamu cari tidak ada atau sudah dipindahkan.",
    "error.notFound.backHome": "Kembali ke beranda",
    "error.pageFailed.title": "Halaman ini gagal dimuat",
    "error.pageFailed.desc": "Terjadi kesalahan. Coba muat ulang atau kembali ke beranda.",
    "error.pageFailed.home": "Beranda",
    "error.featureBroken": "{feature} sedang bermasalah",
    "error.featureBrokenDesc":
      "Tenang, fitur lain tetap bisa kamu pakai. Coba muat ulang bagian ini.",

    // ── Privacy / Data ────────────────────────────────────────────
    "privacy.title": "Privasi",
    "privacy.improveAI": "Bantu tingkatkan AI",
    "privacy.improveAIDesc":
      "Izinkan koreksi scan makanan kamu dikirim secara anonim untuk audit kualitas AI.",
    "privacy.autoRedact": "Redaksi otomatis data sensitif",
    "privacy.autoRedactDesc":
      "Saat aktif, nomor telepon, email, KTP/NIK, dan nomor kartu kredit di pesan chat akan otomatis disembunyikan sebelum dikirim ke AI. Pesan di riwayat chat kamu tetap utuh.",
    "privacy.downloadData": "Unduh data saya",
    "privacy.downloadDataDesc": "Ekspor semua data pribadi Anda dalam format JSON atau CSV.",
    "privacy.policyDesc":
      "Data apa saja yang kami kumpulkan dan hak-hak Anda sebagai pengguna (UU PDP No. 27/2022).",
    "privacy.notFound": "Tidak ditemukan",

    // ── Sustainability ────────────────────────────────────────────
    "sustainability.calculatingCarbon": "Menghitung jejak karbon\u2026",
    "sustainability.noData": "Belum ada data minggu ini",
  },

  // ══════════════════════════════════════════════════════════════════
  //  ENGLISH (en)
  // ══════════════════════════════════════════════════════════════════
  en: {
    // ── PDF reports ───────────────────────────────────────────────
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

    // ── Navigation ────────────────────────────────────────────────
    "nav.home": "Home",
    "nav.scan": "Scan",
    "nav.fasting": "Fasting",
    "nav.workout": "Workout",
    "nav.coach": "AI Coach",
    "nav.profile": "Profile",
    "nav.database": "Database",
    "nav.foods": "Foods",
    "nav.main": "Main navigation",

    // ── Common / Shared ───────────────────────────────────────────
    "common.back": "Back",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.loading": "Loading\u2026",
    "common.searching": "Searching\u2026",
    "common.error": "Error",
    "common.retry": "Try again",
    "common.delete": "Delete",
    "common.deleted": "Deleted",
    "common.logged": "Logged",
    "common.sending": "Sending\u2026",
    "common.saved": "Saved",
    "common.history": "History",
    "common.all": "All",
    "common.total": "Total",
    "common.viewAll": "View all",
    "common.seeAll": "All",
    "common.detail": "Detail",
    "common.open": "Open",
    "common.close": "Close",
    "common.closeTip": "Close tip",
    "common.closeNotif": "Close notification",
    "common.add": "Add",
    "common.home": "Home",
    "common.tryAgain": "Try again",
    "common.noData": "No data yet",
    "common.offlineMessage": "No internet connection",
    "common.offlineSaved": "saved offline. Will sync automatically.",
    "common.unknownProduct": "Unnamed",
    "common.defaultName": "Friend",

    // ── Settings ──────────────────────────────────────────────────
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

    // ── Preferences ───────────────────────────────────────────────
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

    // ── Chat Settings ─────────────────────────────────────────────
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

    // ── Dashboard ─────────────────────────────────────────────────
    "dashboard.coachmark.title": "Welcome to Healthy U",
    "dashboard.coachmark.description":
      "Swipe down to refresh, tap cards to log activities, and visit Profile to personalise.",
    "dashboard.today": "Today",
    "dashboard.detail": "Detail",
    "dashboard.quickActions": "Quick Actions",
    "dashboard.nextStep": "Next Step",
    "dashboard.metaPatternDetected": "\u26A0\uFE0F Important Pattern Detected",
    "dashboard.viewAll": "View all",
    "dashboard.achievement": "\uD83C\uDF96 Achievement",
    "dashboard.seeAll": "All",
    "dashboard.weeklySummary": "\uD83D\uDCCA Weekly Summary",
    "dashboard.weeklyDigest.title": "Send This Week\u2019s Summary",
    "dashboard.weeklyDigest.description":
      "Get the top 3 eating patterns from the last 7 days straight to your email.",
    "dashboard.weeklyDigest.sending": "Sending...",
    "dashboard.weeklyDigest.resend": "\u2713 Resend",
    "dashboard.weeklyDigest.send": "\uD83D\uDCE7 Send to Email",
    "dashboard.weeklyDigest.sent": "\u2713 Sent ({count} patterns)",
    "dashboard.weeklyDigest.info": "Info: {reason}",
    "dashboard.weeklyDigest.notProcessed": "not yet processed",
    "dashboard.aiCoach": "AI Coach",
    "dashboard.open": "Open",
    "dashboard.patternInsights": "Pattern Insights",
    "dashboard.tracking": "Tracking",
    "dashboard.hide": "Hide",
    "dashboard.seeAllSections": "Show All",
    "dashboard.insight": "Insight",
    "dashboard.checkIn": "Check-In",
    "dashboard.motivation": "Motivation",
    "dashboard.others": "Others",
    "dashboard.mealsToday": "Today\u2019s Meals",
    "dashboard.greeting": "Hello, {name}!",
    "dashboard.eyebrow.bonus": "Bonus",

    // ── Coach ────────────────────────────────────────────────────
    "coach.title": "AI Coach",
    "coach.subtitle": "Personalised from your 7-day data",
    "coach.generateError": "Failed to generate coach",
    "coach.loadError": "Failed to load coach",
    "coach.refresh": "Refresh coach",
    "coach.analyzingMorning": "AI is analysing your data\u2026",
    "coach.analyzingEvening": "AI is preparing your evening reflection\u2026",
    "coach.historyLabel": "Coach History (7 days)",
    "coach.noHistory": "No coach history yet.",
    "coach.morningGreeting": "Morning Greeting",
    "coach.todayFocus": "Today\u2019s Focus",
    "coach.lastWeekSummary": "Last Week\u2019s Summary",
    "coach.todayTips": "Today\u2019s Tips",
    "coach.warnings": "Warnings",
    "coach.generatedAt": "Generated {date} \u2022 Not medical advice",
    "coach.eveningReflection": "Evening Reflection",
    "coach.todayWins": "Today\u2019s Wins",
    "coach.forTomorrow": "For Tomorrow",
    "coach.tomorrowFocus": "Tomorrow\u2019s Focus",
    "coach.tonightTips": "Tonight\u2019s Tips",
    "coach.morning": "Morning",
    "coach.evening": "Evening",
    "coach.read": "\u2713 read",
    "coach.new": "new",

    // ── Fasting ───────────────────────────────────────────────────
    "fasting.title": "Fasting",
    "fasting.subtitle": "Manage protocol & schedule",
    "fasting.scheduleSaved": "Schedule saved",
    "fasting.startedToast": "Fast started. Keep it up!",
    "fasting.completedToast": "Congrats! Fast completed \uD83C\uDF89",
    "fasting.stoppedToast": "Fast stopped",
    "fasting.streakLabel": "Consecutive fast streak \uD83D\uDD25",
    "fasting.longest": "Longest",
    "fasting.thisWeek": "This week",
    "fasting.countUnit": "fasts",
    "fasting.protocol": "Protocol {protocol}",
    "fasting.targetHours": "Target: {target} hours",
    "fasting.hydrationTip":
      "Remember to drink water \u2014 hydration helps your body stay comfortable.",
    "fasting.endNow": "End now",
    "fasting.breakFast.title": "Break your fast wisely",
    "fasting.breakFast.desc": "After fasting, give your body time to adjust.",
    "fasting.breakFast.tip1": "Start with a glass of warm water first.",
    "fasting.breakFast.tip2": "Choose light foods: fruit, dates, or warm soup.",
    "fasting.breakFast.tip3": "Eat slowly; avoid large portions right away.",
    "fasting.breakFast.motivation": "Small progress is still progress.",
    "fasting.protocols.label": "Choose protocol",
    "fasting.customDuration": "Custom duration",
    "fasting.startCustom": "Start {hours}-hour fast",
    "fasting.longFastConfirm.title": "Fast longer than 16 hours",
    "fasting.longFastConfirm.desc":
      "Extended fasting is not recommended for pregnant/breastfeeding women, teenagers, or those with a history of eating disorders, diabetes, or other medical conditions. Please stay hydrated and stop anytime if you feel uncomfortable.",
    "fasting.longFastConfirm.agree": "I understand, begin",
    "fasting.ramadhan.label": "Ramadan Mode",
    "fasting.ramadhan.desc": "Daily recurring fast schedule",
    "fasting.imsak": "Imsak",
    "fasting.iftar": "Iftar",
    "fasting.saveSchedule": "Save schedule",
    "fasting.phases.title": "Fasting phases",
    "fasting.phases.subtitle": "What happens during fasting (general guide, not medical advice)",
    "fasting.phases.hydrationReminder":
      "\uD83D\uDCA7 Keep drinking water during your fast. Dehydration is not the goal.",
    "fasting.phases.fedState": "Fed state",
    "fasting.phases.fedStateDesc": "Body uses glucose from food as its main energy source.",
    "fasting.phases.glycogenDepletion": "Glycogen depletion",
    "fasting.phases.glycogenDepletionDesc":
      "Glycogen stores begin to deplete; body starts switching to fat.",
    "fasting.phases.fatBurning": "Fat burning",
    "fasting.phases.fatBurningDesc":
      "Body burns fat for energy (mild ketosis). This is the phase most people aim for.",
    "fasting.safeFasting.label": "Safe Fasting",
    "fasting.towardIftar": "Toward Iftar",
    "fasting.elapsedTarget": "Running {elapsed}h \u00B7 target {target}h",

    // ── Workout ───────────────────────────────────────────────────
    "workout.title": "Workout",
    "workout.subtitle": "{sessions} sessions \u00B7 {minutes} min \u00B7 {cal} kcal",
    "workout.type.cardio": "Cardio",
    "workout.type.strength": "Strength",
    "workout.type.hiit": "HIIT",
    "workout.type.yoga": "Yoga",
    "workout.type.walking": "Walking",
    "workout.type.cycling": "Cycling",
    "workout.programs": "Programs",
    "workout.progress": "Progress",
    "workout.logNew": "Log new session",
    "workout.namePlaceholder": "Name (e.g. Morning run)",
    "workout.duration": "Duration (min)",
    "workout.calories": "Calories",
    "workout.intensity.low": "Low",
    "workout.intensity.medium": "Medium",
    "workout.intensity.high": "High",
    "workout.saveSession": "Save session",
    "workout.empty": "No sessions logged yet",
    "workout.offlineSaved": "Workout saved offline. Will sync automatically.",
    "workout.logged": "Workout logged",
    "workout.activeSession": "Active Session",
    "workout.started": "Started",
    "workout.sessionUnit": "sessions",
    "workout.sync": "Sync {pending}",

    // ── Water / Hydration ─────────────────────────────────────────
    "water.title": "Hydration",
    "water.target": "Target {ml} ml / day",
    "water.today": "Today",
    "water.progress": "{pct}% of target",
    "water.addQuick": "Quick add",
    "water.lastWeek": "Last 7 days",
    "water.todayEntries": "Today\u2019s entries",
    "water.empty": "No entries yet. Tap the buttons above to add.",
    "water.logged": "+{ml}ml logged",
    "water.offlineSaved": "+{ml}ml saved offline. Will sync automatically.",
    "water.mlUnit": "ml",

    // ── Meals / Food ──────────────────────────────────────────────
    "meals.title": "Log meals",
    "meals.subtitle": "Search, scan, or speak",
    "meals.type.breakfast": "Breakfast",
    "meals.type.lunch": "Lunch",
    "meals.type.dinner": "Dinner",
    "meals.type.snack": "Snack",
    "meals.empty": "No meals logged today.",
    "meals.emptyHint": "Start by scanning food or adding manually.",
    "meals.scanFood": "Scan food",
    "meals.addManual": "Add manually",
    "meals.nlPlaceholder": 'Example: "fried rice with grilled chicken, half portion"',
    "meals.logged": "Meal logged",
    "meals.offlineSaved": "Meal saved offline. Will sync automatically.",
    "meals.parseLabel": "Parse food",

    // ── Food Database ─────────────────────────────────────────────
    "foods.dbTitle": "Food Database",
    "foods.searchPlaceholder": "Search rice, chicken, satay...",
    "foods.recentSearch": "Recent searches",
    "foods.region": "Region",
    "foods.category": "Category",
    "foods.tag": "Tag",
    "foods.avoidAllergen": "Avoid allergens",
    "foods.noResults": "No results.",
    "foods.loadMore": "Load More",
    "foods.reset": "Reset",
    "foods.resultCount": "{count} foods",

    // ── Scan ──────────────────────────────────────────────────────
    "scan.barcode.title": "Scan Barcode",
    "scan.barcode.notFound": "Product not found in Open Food Facts",
    "scan.barcode.cameraError": "Cannot access camera",
    "scan.barcode.searching": "Looking up product\u2026",
    "scan.barcode.codeLabel": "Code: {code}",
    "scan.barcode.portion": "Portion (grams)",
    "scan.barcode.logKcal": "Log {kcal} kcal",
    "scan.barcodeLive.title": "Barcode Scanner",
    "scan.barcodeLive.startHint": 'Tap "Start Scan" to activate camera',
    "scan.barcodeLive.browserNotSupported": "Browser does not support BarcodeDetector",
    "scan.barcodeLive.useManual": "Browser does not support BarcodeDetector. Use manual input.",
    "scan.barcodeLive.manualPlaceholder": "Or type barcode manually",
    "scan.barcodeLive.detected": "Detected: {code}",
    "scan.barcodeLive.searchProduct": "Search Product",
    "scan.barcodeLive.stopScan": "Stop Scan",
    "scan.barcodeLive.startScan": "Start Scan",
    "scan.nutrition.calories": "Calories",
    "scan.nutrition.protein": "Protein",
    "scan.nutrition.carbs": "Carbs",
    "scan.nutrition.fat": "Fat",
    "scan.allergens": "\u26A0\uFE0F Allergens: {allergens}",
    "scan.voice.title": "Log by Voice",
    "scan.voice.browserNotSupported":
      "Browser does not support speech recognition. Try Chrome/Edge.",
    "scan.voice.listening": "Listening\u2026 say what you ate",
    "scan.voice.pressToTalk": "Tap to start speaking",
    "scan.voice.example": 'Example: "I ate fried rice with iced sweet tea"',
    "scan.voice.typeManual": "Or type manually\u2026",
    "scan.voice.analyze": "Analyze with AI",
    "scan.voice.detected": "Detected",
    "scan.voice.notRecognized": "No food items recognised",

    // ── Scan Food Photo ──────────────────────────────────────────
    "scan.foodPhoto.title": "Food Scan",
    "scan.foodPhoto.tip":
      "\uD83D\uDCA1 Tip: include a reference (spoon, fork, or hand) in the photo for more accurate portion estimates.",
    "scan.foodPhoto.ctaTitle": "Photograph your food",
    "scan.foodPhoto.ctaDesc":
      "AI estimates name, portion & calories \u2014 you can edit before saving",
    "scan.foodPhoto.choosePhoto": "Take / Choose Photo",
    "scan.history": "Scan history",
    "scan.limitReached": "Daily limit of {limit} scans. Upgrade to Pro for unlimited.",
    "scan.processError": "Failed to process image",
    "scan.aiMode": "AI Mode: ",
    "scan.modeAccurate": "Accurate (slower)",
    "scan.modeFast": "Fast",
    "scan.switchModeFast": "Switch to fast mode",
    "scan.switchModeAccurate": "Switch to accurate mode",
    "scan.useFast": "Use Fast",
    "scan.useAccurate": "Use Accurate",
    "scan.accurateDesc": "Accurate: slightly slower, but more precise.",
    "scan.fastDesc": "Fast: great for daily logging.",
    "scan.analyzing": "Analysing photo\u2026",
    "scan.canReview": "You can review the results before saving.",
    "scan.scanError": "Scan not successful",
    "scan.retryHint": "Try taking another photo with better lighting, or add manually.",
    "scan.notClear": "Not clearly detected",
    "scan.notClearHint": "Try a closer photo, make sure the food fills the frame, or add manually.",
    "scan.rescan": "Rescan",
    "scan.addManual": "Add manually",

    // ── Profile ───────────────────────────────────────────────────
    "profile.title": "Profile",
    "profile.defaultName": "Friend",
    "profile.edit": "Edit profile",
    "profile.loading": "Loading\u2026",
    "profile.bmi": "BMI",
    "profile.activity": "Activity",
    "profile.weightTarget": "Target weight",
    "profile.dailyCalories": "Daily calories",
    "profile.quickActions": "Quick Actions",
    "profile.scanLabel": "Scan",
    "profile.scanDesc": "Photo, barcode, menu",
    "profile.coachLabel": "AI Coach",
    "profile.coachDesc": "Ask & insights",
    "profile.recipesLabel": "Recipes",
    "profile.recipesDesc": "Your saved ones",
    "profile.recipes": "Recipes",
    "profile.recipesSaved": "Your saved ones",
    "profile.exploreRecipes": "Explore all recipes",
    "profile.moreFeatures": "More Features",
    "profile.settingsSubtitle": "Account, privacy, preferences, notifications",
    "profile.settingsLabel": "Settings",
    "profile.settingsDesc": "Account, privacy, preferences, notifications",
    "profile.logout": "Log out",
    "profile.logoutConfirm": "Sign out of HealthyU?",
    "profile.logoutConfirmDesc":
      "You will be signed out of this account. Your data is safe and can be accessed again when you sign back in.",
    "profile.logoutConfirmYes": "Yes, sign out",
    "profile.logoutDesc":
      "You will be signed out of this account. Your data is safe and can be accessed again when you sign back in.",
    "profile.logoutYes": "Yes, sign out",

    // ── Reports ───────────────────────────────────────────────────
    "reports.weekly.title": "AI Weekly Report",
    "reports.generating": "Generating AI summary\u2026",
    "reports.calculatingCarbon": "Calculating carbon footprint\u2026",
    "reports.calculatingWeek": "Calculating week\u2026",
    "reports.shareCard.title": "Week Card \u2014 Shareable",
    "reports.shareCard.share": "Share Card",
    "reports.shareCard.sharing": "Creating\u2026",
    "reports.shareCard.success": "Shared successfully ({via})",
    "reports.shareCard.cancelled": "Cancelled",
    "reports.shareCard.failed": "Failed to share",
    "reports.stat.calPerDay": "Cal/day",
    "reports.stat.workout": "Workout",
    "reports.stat.waterPerDay": "Water/day",
    "reports.stat.activeDays": "Active days",
    "reports.stat.activityScore": "{score}/100 activity",
    "reports.title": "7-Day Report",
    "reports.subtitle": "Weekly health summary",
    "reports.stat.totalCalIn": "Total calories in",
    "reports.stat.burn": "Calories burned",
    "reports.stat.totalWater": "Total water",
    "reports.stat.totalSleep": "Total sleep",
    "reports.stat.fastingDone": "Fasts completed",
    "reports.unit.kcal": "kcal",
    "reports.unit.liter": "litre",
    "reports.unit.hours": "hours",
    "reports.generateError": "Failed to generate",
    "reports.announceGenerated": "Report {periode} newly generated",
    "reports.announceGenerateError": "Failed to generate report: {msg}",
    "reports.latest": "latest",

    // ── Vitals ────────────────────────────────────────────────────
    "vitals.title": "Vital Signs",
    "vitals.offlineSaved": "Vitals saved offline. Will sync automatically.",
    "vitals.logged": "Vital signs logged",

    // ── Mood ──────────────────────────────────────────────────────
    "mood.title": "Mood & Journal",
    "mood.subtitle": "Record how you feel today",
    "mood.avgLabel": "30-day average: {avg} / 5",
    "mood.empty": "No mood entries yet",
    "mood.emptyHint": "Select an emoji above to log how you feel today.",
    "mood.logged": "Mood logged",
    "mood.offlineSaved": "Mood saved offline. Will sync automatically.",
    "mood.heatmap.title": "Yearly Mood Heatmap",

    // ── Sleep ─────────────────────────────────────────────────────
    "sleep.title": "Sleep",
    "sleep.avg7Days": "7-day average",
    "sleep.quality": "Quality",
    "sleep.trend": "7-day trend",
    "sleep.log": "Log sleep",
    "sleep.sleepStart": "Fell asleep",
    "sleep.wakeUp": "Woke up",
    "sleep.empty": "No entries yet",
    "sleep.logged": "Sleep logged",
    "sleep.hourUnit": "h",

    // ── Weight ────────────────────────────────────────────────────
    "weight.title": "Body Weight",
    "weight.current": "Current",
    "weight.target": "Target",
    "weight.change.unchanged": "Unchanged",
    "weight.change.sinceStart": "{delta} kg since start",
    "weight.logToday": "Log today\u2019s weight",
    "weight.notePlaceholder": "Note (optional)",
    "weight.trend": "Trend ({count} entries)",
    "weight.empty": "No weight entries yet",
    "weight.emptyHint": "Log your weight to track progress",
    "weight.logged": "Weight logged",
    "weight.offlineSaved": "Weight saved offline. Will sync automatically.",

    // ── Prayer ────────────────────────────────────────────────────
    "prayer.title": "Prayer Times",
    "prayer.source": "Source: Aladhan API \u00B7 Kemenag RI Method",
    "prayer.names.fajr": "Fajr",
    "prayer.names.dhuhr": "Dhuhr",
    "prayer.names.asr": "Asr",
    "prayer.names.maghrib": "Maghrib",
    "prayer.names.isha": "Isha",
    "prayer.notifOn": "Prayer notifications active",
    "prayer.notifOff": "Prayer notifications disabled",

    // ── Community ─────────────────────────────────────────────────
    "community.title": "Community",
    "community.subtitle": "Share tips & support",
    "community.stats.posts": "Posts",
    "community.stats.likes": "Likes",
    "community.stats.active": "Active",
    "community.sort.newest": "Newest",
    "community.sort.popular": "Popular",
    "community.empty": "No posts yet. Be the first!",
    "community.posted": "Post sent",

    // ── Reminders ─────────────────────────────────────────────────
    "reminders.title": "Smart Reminders",
    "reminders.enableNotif": "Enable notifications",
    "reminders.notifActive": "Notifications active",
    "reminders.pwaHint":
      "Reminders run while the app is open. Install as a PWA to keep them active in the background.",
    "reminders.browserNotSupported": "Browser does not support notifications",
    "reminders.notifEnabled": "Notifications enabled",
    "reminders.notifDenied": "Notification permission denied",
    "reminders.notifReady": "Reminders ready to send \uD83D\uDD14",
    "reminders.enterName": "Enter reminder name",
    "reminders.added": "Reminder added",
    "reminders.addLabel": "Add reminder",

    // ── Onboarding ────────────────────────────────────────────────
    "onboarding.profileSaved": "Profile saved!",

    // ── Hijri / Calendar ──────────────────────────────────────────
    "hijri.label": "Hijri",
    "hijri.ramadhanCountdown": "Ramadan Countdown",
    "hijri.daysLeft": "{days} days left",
    "hijri.towardRamadhan": "days until Ramadan",
    "hijri.todayRamadhan": "\uD83C\uDF19 Ramadan 1448 H begins today",
    "hijri.featureTitle": "Hijri Date",

    // ── Offline / Sync ────────────────────────────────────────────
    "offline.mode": "Offline mode",
    "offline.pendingCount": "{count} entries waiting to sync\u2026",
    "offline.noPending": "No pending items.",
    "offline.failedLabel": "Sync failed",
    "offline.cleaned": "Cleaned up",
    "offline.deleteAll": "Delete all",
    "offline.noFailed": "No failed items.",
    "offline.resent": "Requeued",
    "offline.syncNow": "Sync now ({count})",
    "offline.queueTitle": "Offline Queue",
    "offline.queueSubtitle": "\u00B7 pending \u00B7 failed",
    "offline.waitingSync": "Waiting to sync",
    "offline.kind.hydration": "Hydration",
    "offline.kind.weight": "Weight",
    "offline.kind.meal": "Meal",
    "offline.kind.mood": "Mood",
    "offline.kind.vitals": "Vitals",
    "offline.kind.workout": "Workout",
    "offline.banner.offline": "You are offline. New entries will be saved locally.",
    "offline.banner.offlinePending":
      "Offline \u00B7 {count} entries waiting to sync when connection returns.",
    "offline.banner.pending": "{count} entries waiting to sync\u2026",
    "offline.band.modeOffline": "Offline mode",
    "offline.band.entriesWaiting": "{count} entries waiting for sync",
    "offline.band.sync": "Sync",
    "offline.band.deleteFailed": "Delete failed",
    "offline.band.noStuck": "No failed entries.",
    "offline.band.deletedCount": "{count} failed entries removed{extra}",
    "offline.purgeConfirm":
      "Delete all entries that failed to sync > 7 days? This cannot be undone.",

    // ── PWA / Service Worker ──────────────────────────────────────
    "pwa.updateAvailable": "Update available",
    "pwa.offlineReady": "Ready for offline use",
    "pwa.updateDesc": "A new version has been downloaded. Reload to apply.",
    "pwa.offlineDesc": "HealthyU is accessible even without internet.",
    "pwa.reload": "Reload",
    "pwa.dismiss": "Later",

    // ── Error / Not Found ─────────────────────────────────────────
    "error.notFound.title": "Page not found",
    "error.notFound.desc": "The page you are looking for does not exist or has been moved.",
    "error.notFound.backHome": "Back to home",
    "error.pageFailed.title": "This page failed to load",
    "error.pageFailed.desc": "Something went wrong. Try reloading or go back to home.",
    "error.pageFailed.home": "Home",
    "error.featureBroken": "{feature} is having issues",
    "error.featureBrokenDesc":
      "Don\u2019t worry, other features still work. Try reloading this section.",

    // ── Privacy / Data ────────────────────────────────────────────
    "privacy.title": "Privacy",
    "privacy.improveAI": "Help improve AI",
    "privacy.improveAIDesc":
      "Allow your food scan corrections to be sent anonymously for AI quality auditing.",
    "privacy.autoRedact": "Auto redact sensitive data",
    "privacy.autoRedactDesc":
      "When active, phone numbers, emails, ID numbers, and credit card numbers in chat messages are automatically hidden before being sent to AI. Messages in your chat history remain intact.",
    "privacy.downloadData": "Download my data",
    "privacy.downloadDataDesc": "Export all your personal data in JSON or CSV format.",
    "privacy.policyDesc": "What data we collect and your rights as a user (PDP Act No. 27/2022).",
    "privacy.notFound": "Not found",

    // ── Sustainability ────────────────────────────────────────────
    "sustainability.calculatingCarbon": "Calculating carbon footprint\u2026",
    "sustainability.noData": "No data this week",
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
