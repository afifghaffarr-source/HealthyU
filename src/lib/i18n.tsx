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
  | "common.refresh"
  | "common.saving"
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
  | "sustainability.noData"

  // ── progress ──
  | "progress.title"
  | "progress.subtitle"
  | "progress.photoSaved"
  | "progress.uploadFailed"
  | "progress.empty"
  | "progress.emptyHint"
  | "progress.saveFailed"

  // ── achievements ──
  | "achievements.title"
  | "achievements.level"
  | "achievements.xpToLevel"
  | "achievements.share"
  | "achievements.shareTitle"
  | "achievements.imageDownloaded"
  | "achievements.imageFailed"
  | "achievements.streakLabel"
  | "achievements.daysUnit"
  | "achievements.longestLabel"
  | "achievements.badgeCount"
  | "achievements.dayUnit"

  // ── alarms ──
  | "alarms.title"
  | "alarms.wakeTime"
  | "alarms.windowHint"
  | "alarms.saved"

  // ── backup ──
  | "backup.title"
  | "backup.downloadAll"
  | "backup.downloadAllDesc"
  | "backup.auditLogged"
  | "backup.allTables"
  | "backup.generatingJson"
  | "backup.downloadJsonFull"
  | "backup.generatingCsv"
  | "backup.downloadCsv"
  | "backup.fileWarning"
  | "backup.exportHistory"
  | "backup.entriesCount"
  | "backup.noHistory"
  | "backup.tableUnit"
  | "backup.rowUnit"
  | "backup.success"
  | "backup.failed"
  | "backup.pdpDisclaimer"
  | "backup.justNow"
  | "backup.minutesAgo"
  | "backup.hoursAgo"
  | "backup.daysAgo"

  // ── googleCalendar ──
  | "googleCalendar.title"
  | "googleCalendar.syncHint"
  | "googleCalendar.connect"
  | "googleCalendar.oauthConfig"

  // ── challenges ──
  | "challenges.title"
  | "challenges.empty"
  | "challenges.emptyDesc"
  | "challenges.alreadyJoined"
  | "challenges.joined"
  | "challenges.alreadyJoinedAnnounce"
  | "challenges.joinedAnnounce"
  | "challenges.dayLogged"
  | "challenges.left"
  | "challenges.continueChallenge"
  | "challenges.dayLabel"

  // ── community ──
  | "community.postUnit"
  | "community.categoryAll"

  // ── onboarding ──
  | "onboarding.saveFailed"

  // ── referrals ──
  | "referrals.title"
  | "referrals.yourCode"
  | "referrals.shareHint"
  | "referrals.copy"
  | "referrals.shareButton"
  | "referrals.invited"
  | "referrals.completed"
  | "referrals.coins"
  | "referrals.hasCode"
  | "referrals.singleUse"
  | "referrals.apply"
  | "referrals.appliedSuccess"
  | "referrals.codeCopied"
  | "referrals.linkCopied"
  | "referrals.codePlaceholder"
  | "referrals.shareMessage"

  // ── reminders ──
  | "reminders.soon"
  | "reminders.countdownHm"
  | "reminders.countdownM"

  // ── subscription ──
  | "subscription.title"
  | "subscription.currently"
  | "subscription.active"
  | "subscription.select"
  | "subscription.upgraded"

  // ── notifications ──
  | "notifications.title"
  | "notifications.subtitle"

  // ── mealplan ──
  | "mealplan.title"
  | "mealplan.subtitle"
  | "mealplan.weekView"
  | "mealplan.weekViewDesc"
  | "mealplan.dayView"
  | "mealplan.generateAI"
  | "mealplan.budgetTitle"
  | "mealplan.budgetLabel"
  | "mealplan.budgetDays"
  | "mealplan.aiGenerating"
  | "mealplan.generatePlan"
  | "mealplan.dayLabel"
  | "mealplan.groceryTitle"
  | "mealplan.groceryCount"
  | "mealplan.planAdded"
  | "mealplan.weeklyTitle"
  | "mealplan.weeklySubtitle"

  // ── meals ──
  | "meals.detailTitle"
  | "meals.ingredientsLabel"
  | "meals.cookingSteps"
  | "meals.alternatives"
  | "meals.addToDiary"
  | "meals.addedToDiary"
  | "meals.linkCopied"
  | "meals.parseError"
  | "meals.voiceParseError"
  | "meals.syncPending"

  // ── recommendations ──
  | "recommendations.title"
  | "recommendations.subtitle"
  | "recommendations.notesLabel"
  | "recommendations.notesPlaceholder"
  | "recommendations.generating"
  | "recommendations.generateButton"
  | "recommendations.aiBadge"
  | "recommendations.templateBadge"
  | "recommendations.budgetRemaining"
  | "recommendations.totalPlan"
  | "recommendations.aiUnavailable"
  | "recommendations.forceAiRetry"
  | "recommendations.saveToMealPlan"
  | "recommendations.saved"
  | "recommendations.saveError"
  | "recommendations.noRecommendation"
  | "recommendations.aiNotAvailable"

  // ── reverseCalorie ──
  | "reverseCalorie.title"
  | "reverseCalorie.targetLabel"
  | "reverseCalorie.searchButton"

  // ── shopping ──
  | "shopping.smartTitle"
  | "shopping.smartPlaceholder"
  | "shopping.smartGenerating"
  | "shopping.smartGenerate"
  | "shopping.deriveTitle"
  | "shopping.deriveSubtitle"
  | "shopping.deriveFromPlan"
  | "shopping.deriveProgress"
  | "shopping.deriveManual"
  | "shopping.deriveDownloaded"
  | "shopping.deriveSaveShare"
  | "shopping.listTitle"
  | "shopping.listPlaceholder"
  | "shopping.listEstimatePrice"

  // ── restaurants ──
  | "restaurants.nearbyTitle"
  | "restaurants.searchNearby"
  | "restaurants.pressToSearch"

  // ── foods ──
  | "foods.filterCount"
  | "foods.filterLabel"

  // ── pet ──
  | "pet.title"
  | "pet.adoptTitle"
  | "pet.adoptDesc"
  | "pet.namePlaceholder"
  | "pet.adoptBtn"
  | "pet.adoptedToast"
  | "pet.healthLabel"
  | "pet.happinessLabel"
  | "pet.energyLabel"
  | "pet.hungerLabel"
  | "pet.feedBtn"
  | "pet.playBtn"
  | "pet.restBtn"
  | "pet.levelExp"
  | "pet.expToNext"
  | "pet.evolution.title"
  | "pet.evolution.stages.egg"
  | "pet.evolution.stages.hatchling"
  | "pet.evolution.stages.child"
  | "pet.evolution.stages.teen"
  | "pet.evolution.stages.adult"
  | "pet.evolution.stageProgress"
  | "pet.evolution.xpNeeded"
  | "pet.evolution.peakForm"
  | "pet.evolution.evolveBtn"
  | "pet.evolution.restartBtn"
  | "pet.shop.title"
  | "pet.shop.bought"
  | "pet.shop.equipped"
  | "pet.shop.equip"
  | "pet.shop.buy"
  | "pet.svg.title"
  | "pet.svg.stageLabel"
  | "pet.svg.stageProgress"

  // ── gacha ──
  | "gacha.title"
  | "gacha.spin"
  | "gacha.costHint"
  | "gacha.spinning"
  | "gacha.pullBtn"
  | "gacha.result"

  // ── rewards ──
  | "rewards.title"
  | "rewards.subtitle"
  | "rewards.outOfStock"
  | "rewards.notEnough"
  | "rewards.redeem"
  | "rewards.empty"
  | "rewards.historyTitle"
  | "rewards.redeemed"
  | "rewards.failed"

  // ── currency ──
  | "currency.title"
  | "currency.convertBtn"

  // ── loginBonus ──
  | "loginBonus.title"
  | "loginBonus.desc"
  | "loginBonus.claiming"
  | "loginBonus.claimBtn"
  | "loginBonus.alreadyClaimed"
  | "loginBonus.claimed"

  // ── streakFreeze ──
  | "streakFreeze.title"
  | "streakFreeze.desc"
  | "streakFreeze.used"
  | "streakFreeze.useBtn"

  // ── quiz ──
  | "quiz.title"
  | "quiz.quoteToday"
  | "quiz.question"
  | "quiz.correct"
  | "quiz.wrong"

  // ── stories ──
  | "stories.title"
  | "stories.placeholder"
  | "stories.posted"
  | "stories.loading"
  | "stories.unknownUser"
  | "stories.imageAlt"
  | "stories.empty"

  // ── groups ──
  | "groups.title"
  | "groups.subtitle"
  | "groups.createTitle"
  | "groups.createPlaceholder"
  | "groups.createBtn"
  | "groups.creating"
  | "groups.joinTitle"
  | "groups.joinPlaceholder"
  | "groups.joinBtn"
  | "groups.joining"
  | "groups.myGroups"
  | "groups.loading"
  | "groups.empty"
  | "groups.created"
  | "groups.joined"
  | "groups.createFailed"
  | "groups.joinFailed"

  // ── leaderboard ──
  | "leaderboard.title"
  | "leaderboard.subtitle"
  | "leaderboard.loading"
  | "leaderboard.you"
  | "leaderboard.level"
  | "leaderboard.xp"
  | "leaderboard.empty"

  // ── leaderboardWeekly ──
  | "leaderboardWeekly.title"

  // ── discover ──
  | "discover.title"
  | "discover.subtitle"
  | "discover.publicCommunity"
  | "discover.seeAllPosts"

  // ── heatmap ──
  | "heatmap.title"
  | "heatmap.last365"
  | "heatmap.mealTooltip"

  // ── insights ──
  | "insights.title"
  | "insights.badge"
  | "insights.refresh"
  | "insights.tipsForYou"
  | "insights.sameAsYesterday"
  | "insights.share"
  | "insights.notFound"
  | "insights.copiedMeals"
  | "insights.noMealsYesterday"
  | "insights.clipboardCopied"
  | "insights.shareTitle"

  // ── charity ──
  | "charity.title"
  | "charity.donateBtn"
  | "charity.thanks"

  // ── family ──
  | "family.title"
  | "family.createTitle"
  | "family.namePlaceholder"
  | "family.createBtn"
  | "family.activePlan"
  | "privacy.openSettings"
  | "privacy.toggleAudit"
  | "privacy.togglePiiRedact"
  | "privacy.policyLinkTitle"
  | "privacyPolicy.title"
  | "privacyPolicy.lastUpdated"
  | "privacyPolicy.summaryTitle"
  | "privacyPolicy.summaryLead"
  | "privacyPolicy.section1Title"
  | "privacyPolicy.section1UserTitle"
  | "privacyPolicy.section1AutoTitle"
  | "privacyPolicy.section2Title"
  | "privacyPolicy.section3Title"
  | "privacyPolicy.section4Title"
  | "privacyPolicy.section5Title"
  | "privacyPolicy.section5Intro"
  | "privacyPolicy.rightAccessTitle"
  | "privacyPolicy.rightAccessDesc"
  | "privacyPolicy.rightAccessAction"
  | "privacyPolicy.rightCopyTitle"
  | "privacyPolicy.rightCopyDesc"
  | "privacyPolicy.rightCopyAction"
  | "privacyPolicy.rightFixTitle"
  | "privacyPolicy.rightFixDesc"
  | "privacyPolicy.rightFixAction"
  | "privacyPolicy.rightDeleteTitle"
  | "privacyPolicy.rightDeleteDesc"
  | "privacyPolicy.rightDeleteAction"
  | "privacyPolicy.section5After"
  | "privacyPolicy.section6Title"
  | "privacyPolicy.section7Title"
  | "privacyPolicy.section7Body"
  | "privacyPolicy.section8Title"
  | "privacyPolicy.section8Intro"
  | "privacyPolicy.section8EmailLabel"
  | "privacyPolicy.section8After"
  | "privacyPolicy.section9Title"
  | "privacyPolicy.section9Body"
  | "privacyPolicy.footer"
  | "privacyPolicy.publicNotice"
  | "backup.historyMeta"
  | "body.title"
  | "body.tabs.weight"
  | "body.tabs.measurements"
  | "body.tabs.photo"
  | "body.tabs.vitals"
  | "body.weightChart"
  | "body.weightGoal"
  | "body.measurements.waist"
  | "body.measurements.chest"
  | "body.measurements.arm"
  | "body.measurements.thigh"
  | "body.measurementsHint"
  | "body.photo.addProgress"
  | "body.photo.angles"
  | "body.photo.upload"
  | "body.vitals.bloodPressure"
  | "body.vitals.heartRate"
  | "body.vitals.bodyTemp"
  | "body.vitals.spo2"
  | "body.vitalsLogLink"
  | "patternSettings.title"
  | "patternSettings.subtitle"
  | "patternSettings.skipBreakfastLabel"
  | "patternSettings.daysPerWeek"
  | "patternSettings.skipBreakfastDesc"
  | "patternSettings.lateNightDinnerLabel"
  | "patternSettings.lateNightDesc"
  | "patternSettings.irregularVarianceLabel"
  | "patternSettings.hoursUnit"
  | "patternSettings.irregularDesc"
  | "patternSettings.thresholdTitle"
  | "patternSettings.thresholdDesc"
  | "patternSettings.sensitivityTitle"
  | "patternSettings.sensitivityDesc"
  | "patternSettings.sensitivityLabel"
  | "patternSettings.sensitivity.low"
  | "patternSettings.sensitivity.medium"
  | "patternSettings.sensitivity.high"
  | "patternSettings.sensitivityHint"
  | "patternSettings.saveButton"
  | "patternSettings.savingButton"
  | "patternSettings.resetButton"
  | "patternSettings.savedAlert"
  | "patternSettings.errorAlert"
  | "articles.title"
  | "articles.navTitle"
  | "articles.savedFilter"
  | "articles.empty"
  | "articles.emptyDesc"
  | "articles.noResults"
  | "articles.noResultsDesc"
  | "articles.byline"
  | "articles.unbookmark"
  | "articles.bookmark"
  | "articles.readingTime"
  | "articles.share.trigger"
  | "articles.share.dialogTitle"
  | "articles.share.dialogText"
  | "articles.linkCopied"
  | "articles.loadError"
  | "articles.loadErrorDesc"
  | "articles.notFound"
  | "articles.notFoundDesc"
  | "articles.contentMissing"
  | "articles.takeaway"
  | "articles.relatedTitle"
  | "articles.loadFailImage"
  | "sleep.diaryTitle"
  | "sleep.diaryTonight"
  | "sleep.diaryHours"
  | "sleep.diaryBedtimeLabel"
  | "sleep.diaryWakeLabel"
  | "sleep.diaryNotePlaceholder"
  | "sleep.diaryAvgQuality"
  | "sleep.diaryHistory"
  | "scan.label.title"
  | "scan.label.subtitle"
  | "scan.label.takePhoto"
  | "scan.label.gallery"
  | "scan.label.clientScan"
  | "scan.label.aiVision"
  | "scan.label.noOcrBrowser"
  | "scan.label.changePhoto"
  | "scan.label.processing"
  | "scan.label.progressStatus"
  | "scan.label.enginePreparing"
  | "scan.label.engineInitializing"
  | "scan.label.engineReading"
  | "scan.label.engineDone"
  | "scan.label.ocrNotSupported"
  | "scan.label.aiVisionPending"
  | "scan.label.offlineSupported"
  | "scan.label.offlineNoSupport"
  | "scan.label.tryAi"
  | "scan.label.mealLogTitle"
  | "scan.label.mealTypes.breakfast"
  | "scan.label.mealTypes.lunch"
  | "scan.label.mealTypes.dinner"
  | "scan.label.mealTypes.snack"
  | "scan.label.savedAs.breakfast"
  | "scan.label.savedAs.lunch"
  | "scan.label.savedAs.dinner"
  | "scan.label.savedAs.snack"
  | "scan.label.servingDefault"
  | "scan.label.scanAnother"
  | "scan.label.aiParsing"
  | "scan.label.aiParsingHint"
  | "scan.label.aiVisionReading"
  | "scan.label.aiVisionHint"
  | "scan.label.aiSuccess"
  | "scan.label.aiFailed"
  | "scan.label.altText"
  | "scan.label.lowConfidenceHint"
  | "scan.label.matchedFields"
  | "scan.label.ocrFailed"
  | "scan.label.saveToMealLogSuccess"
  | "scan.label.saveFailed"
  | "scan.label.readFailedFallback"
  | "scan.label.detectedFallback"
  | "backup.pdpDisclaimerTitle"
  | "backup.pdpDisclaimerBody"
  | "articles.shareFallback"
  | "scan.label.resultsTitle"
  | "scan.label.fieldsDetected"
  | "scan.label.noServingSize"
  | "scan.label.energy"
  | "scan.label.protein"
  | "scan.label.carbs"
  | "scan.label.sugar"
  | "scan.label.fatTotal"
  | "scan.label.fatSat"
  | "scan.label.fatTrans"
  | "scan.label.fiber"
  | "scan.label.sodium"
  | "scan.label.cholesterol"
  | "scan.label.kcal"
  | "scan.label.confidenceAccurate"
  | "scan.label.confidenceLow"
  | "scan.label.confidenceMedium"
  | "privacyPolicy.section1UserItems.akun"
  | "privacyPolicy.section1UserItems.profil"
  | "privacyPolicy.section1UserItems.log"
  | "privacyPolicy.section1UserItems.komunitas"
  | "privacyPolicy.section1UserItems.ai"
  | "privacyPolicy.section1AutoItems.auth"
  | "privacyPolicy.section1AutoItems.notif"
  | "privacyPolicy.section1AutoItems.wearable"
  | "privacyPolicy.section1AutoItems.logs"
  | "privacyPolicy.section2Item.summary"
  | "privacyPolicy.section2Item.recommend"
  | "privacyPolicy.section2Item.notif"
  | "privacyPolicy.section2Item.audit"
  | "privacyPolicy.section2NoTargeted"
  | "privacyPolicy.section4ActiveAccount"
  | "privacy.openSettings"
  | "privacy.toggleAudit"
  | "privacy.togglePiiRedact"
  | "privacy.policyLinkTitle"
  | "privacyPolicy.title"
  | "privacyPolicy.lastUpdated"
  | "privacyPolicy.summaryTitle"
  | "privacyPolicy.summaryLead"
  | "privacyPolicy.section1Title"
  | "privacyPolicy.section1UserTitle"
  | "privacyPolicy.section1AutoTitle"
  | "privacyPolicy.section1UserItems.akun"
  | "privacyPolicy.section1UserItems.profil"
  | "privacyPolicy.section1UserItems.log"
  | "privacyPolicy.section1UserItems.komunitas"
  | "privacyPolicy.section1UserItems.ai"
  | "privacyPolicy.section1AutoItems.auth"
  | "privacyPolicy.section1AutoItems.notif"
  | "privacyPolicy.section1AutoItems.wearable"
  | "privacyPolicy.section1AutoItems.logs"
  | "privacyPolicy.section2Item.summary"
  | "privacyPolicy.section2Item.recommend"
  | "privacyPolicy.section2Item.notif"
  | "privacyPolicy.section2Item.audit"
  | "privacyPolicy.section2NoTargeted"
  | "privacyPolicy.section4ActiveAccount"
  | "privacyPolicy.section2Title"
  | "privacyPolicy.section3Title"
  | "privacyPolicy.section4Title"
  | "privacyPolicy.section5Title"
  | "privacyPolicy.section5Intro"
  | "privacyPolicy.rightAccessTitle"
  | "privacyPolicy.rightAccessDesc"
  | "privacyPolicy.rightAccessAction"
  | "privacyPolicy.rightCopyTitle"
  | "privacyPolicy.rightCopyDesc"
  | "privacyPolicy.rightCopyAction"
  | "privacyPolicy.rightFixTitle"
  | "privacyPolicy.rightFixDesc"
  | "privacyPolicy.rightFixAction"
  | "privacyPolicy.rightDeleteTitle"
  | "privacyPolicy.rightDeleteDesc"
  | "privacyPolicy.rightDeleteAction"
  | "privacyPolicy.section5After"
  | "privacyPolicy.section6Title"
  | "privacyPolicy.section7Title"
  | "privacyPolicy.section7Body"
  | "privacyPolicy.section8Title"
  | "privacyPolicy.section8Intro"
  | "privacyPolicy.section8EmailLabel"
  | "privacyPolicy.section8After"
  | "privacyPolicy.section9Title"
  | "privacyPolicy.section9Body"
  | "privacyPolicy.footer"
  | "privacyPolicy.publicNotice"
  | "backup.historyMeta"
  | "backup.pdpDisclaimerTitle"
  | "backup.pdpDisclaimerBody"
  | "body.title"
  | "body.tabs.weight"
  | "body.tabs.measurements"
  | "body.tabs.photo"
  | "body.tabs.vitals"
  | "body.weightChart"
  | "body.weightGoal"
  | "body.measurements.waist"
  | "body.measurements.chest"
  | "body.measurements.arm"
  | "body.measurements.thigh"
  | "body.measurementsHint"
  | "body.photo.addProgress"
  | "body.photo.angles"
  | "body.photo.upload"
  | "body.vitals.bloodPressure"
  | "body.vitals.heartRate"
  | "body.vitals.bodyTemp"
  | "body.vitals.spo2"
  | "body.vitalsLogLink"
  | "patternSettings.title"
  | "patternSettings.subtitle"
  | "patternSettings.skipBreakfastLabel"
  | "patternSettings.daysPerWeek"
  | "patternSettings.skipBreakfastDesc"
  | "patternSettings.lateNightDinnerLabel"
  | "patternSettings.lateNightDesc"
  | "patternSettings.irregularVarianceLabel"
  | "patternSettings.hoursUnit"
  | "patternSettings.irregularDesc"
  | "patternSettings.thresholdTitle"
  | "patternSettings.thresholdDesc"
  | "patternSettings.sensitivityTitle"
  | "patternSettings.sensitivityDesc"
  | "patternSettings.sensitivityLabel"
  | "patternSettings.sensitivity.low"
  | "patternSettings.sensitivity.medium"
  | "patternSettings.sensitivity.high"
  | "patternSettings.sensitivityHint"
  | "patternSettings.saveButton"
  | "patternSettings.savingButton"
  | "patternSettings.resetButton"
  | "patternSettings.savedAlert"
  | "patternSettings.errorAlert"
  | "articles.title"
  | "articles.navTitle"
  | "articles.savedFilter"
  | "articles.empty"
  | "articles.emptyDesc"
  | "articles.noResults"
  | "articles.noResultsDesc"
  | "articles.byline"
  | "articles.unbookmark"
  | "articles.bookmark"
  | "articles.readingTime"
  | "articles.shareFallback"
  | "articles.share.trigger"
  | "articles.share.dialogTitle"
  | "articles.share.dialogText"
  | "articles.linkCopied"
  | "articles.loadError"
  | "articles.loadErrorDesc"
  | "articles.notFound"
  | "articles.notFoundDesc"
  | "articles.contentMissing"
  | "articles.takeaway"
  | "articles.relatedTitle"
  | "articles.loadFailImage"
  | "sleep.diaryTitle"
  | "sleep.diaryTonight"
  | "sleep.diaryHours"
  | "sleep.diaryBedtimeLabel"
  | "sleep.diaryWakeLabel"
  | "sleep.diaryNotePlaceholder"
  | "sleep.diaryAvgQuality"
  | "sleep.diaryHistory"
  | "scan.label.title"
  | "scan.label.subtitle"
  | "scan.label.takePhoto"
  | "scan.label.gallery"
  | "scan.label.clientScan"
  | "scan.label.aiVision"
  | "scan.label.noOcrBrowser"
  | "scan.label.changePhoto"
  | "scan.label.processing"
  | "scan.label.progressStatus"
  | "scan.label.enginePreparing"
  | "scan.label.engineInitializing"
  | "scan.label.engineReading"
  | "scan.label.engineDone"
  | "scan.label.ocrNotSupported"
  | "scan.label.aiVisionPending"
  | "scan.label.offlineSupported"
  | "scan.label.offlineNoSupport"
  | "scan.label.tryAi"
  | "scan.label.mealLogTitle"
  | "scan.label.mealTypes.breakfast"
  | "scan.label.mealTypes.lunch"
  | "scan.label.mealTypes.dinner"
  | "scan.label.mealTypes.snack"
  | "scan.label.savedAs.breakfast"
  | "scan.label.savedAs.lunch"
  | "scan.label.savedAs.dinner"
  | "scan.label.savedAs.snack"
  | "scan.label.servingDefault"
  | "scan.label.scanAnother"
  | "scan.label.aiParsing"
  | "scan.label.aiParsingHint"
  | "scan.label.aiVisionReading"
  | "scan.label.aiVisionHint"
  | "scan.label.aiSuccess"
  | "scan.label.aiFailed"
  | "scan.label.altText"
  | "scan.label.lowConfidenceHint"
  | "scan.label.matchedFields"
  | "scan.label.ocrFailed"
  | "scan.label.saveToMealLogSuccess"
  | "scan.label.saveFailed"
  | "scan.label.readFailedFallback"
  | "scan.label.detectedFallback"
  | "scan.label.resultsTitle"
  | "scan.label.fieldsDetected"
  | "scan.label.noServingSize"
  | "scan.label.energy"
  | "scan.label.protein"
  | "scan.label.carbs"
  | "scan.label.sugar"
  | "scan.label.fatTotal"
  | "scan.label.fatSat"
  | "scan.label.fatTrans"
  | "scan.label.fiber"
  | "scan.label.sodium"
  | "scan.label.cholesterol"
  | "scan.label.kcal"
  | "scan.label.confidenceAccurate"
  | "scan.label.confidenceLow"
  | "scan.label.confidenceMedium"
  | "admin.config.title"
  | "admin.config.subtitle"
  | "admin.config.backToAdmin"
  | "admin.config.empty"
  | "admin.config.savedOk"
  | "admin.config.deletedOk"
  | "admin.config.value"
  | "admin.i18n.title"
  | "admin.i18n.subtitle"
  | "admin.i18n.searchPlaceholder"
  | "admin.i18n.filterAll"
  | "admin.i18n.filterOverridden"
  | "admin.i18n.filterDefault"
  | "admin.i18n.empty"
  | "admin.i18n.selectKeyPrompt"
  | "admin.i18n.savedOk"
  | "admin.i18n.revertedOk"
  | "admin.i18n.overriddenBadge"
  | "admin.i18n.revert"
  | "admin.i18n.saveId"
  | "admin.i18n.saveEn"
  | "admin.notif.title"
  | "admin.notif.subtitle"
  | "admin.notif.channel"
  | "admin.notif.channelAll"
  | "admin.notif.channelEmail"
  | "admin.notif.channelPush"
  | "admin.notif.localeAll"
  | "admin.notif.empty"
  | "admin.notif.searchPlaceholder"
  | "admin.notif.templateKey"
  | "admin.notif.subject"
  | "admin.notif.bodyText"
  | "admin.notif.bodyHtml"
  | "admin.notif.variables"
  | "admin.notif.variablesHint"
  | "admin.notif.isActive"
  | "admin.notif.preview"
  | "admin.notif.previewRendered"
  | "admin.notif.previewSampleVars"
  | "admin.notif.previewHint"
  | "admin.notif.save"
  | "admin.notif.cancel"
  | "admin.notif.delete"
  | "admin.notif.savedOk"
  | "admin.notif.deletedOk"
  | "admin.notif.disabledBadge"
  | "admin.notif.toggleEnable"
  | "admin.notif.toggleDisable"
  | "admin.notif.confirmDelete"
  | "admin.notif.fallbackHint"
  | "admin.notif.updatedAt"
  | "family.createdToast"
  | "scan.fridgeTitle"
  | "admin.users.banTitle"
  | "admin.users.banReason"
  | "admin.users.banReasonPlaceholder"
  | "admin.users.banConfirm"
  | "admin.users.unbanConfirm"
  | "admin.users.forceLogoutConfirm"
  | "admin.users.banAction"
  | "admin.users.unbanAction"
  | "admin.users.forceLogoutAction"
  | "admin.users.details"
  | "admin.users.bannedSuccess"
  | "admin.users.unbannedSuccess"
  | "admin.users.forceLogoutSuccess"
  | "admin.users.bannedBy"
  | "admin.users.neverBanned"
  | "admin.users.recentActivity"
  | "admin.users.noActivity"
  | "admin.users.detailTitle"
  | "admin.users.detailClose"
  | "admin.users.roleAdmin"
  | "admin.users.roleModerator"
  | "admin.users.roleUser"
  | "admin.users.detailLoadFail"
  | "admin.users.confirmYes"
  | "admin.users.confirmNo"
  | "admin.users.featFlagsTitle"
  | "admin.users.featFlagsDesc"
  | "admin.users.featFlagEnabled"
  | "admin.users.featFlagDisabled"
  | "common.featDisabled"
  | "common.featDisabledDesc"
  | "common.featDisabledBack"
  | "common.next"
  | "common.start"
  | "common.skip"
  | "common.edit"
  | "common.send"
  | "common.processing"
  | "common.thinking"
  | "common.previous"
  | "common.dashboard"
  | "common.moods.bad"
  | "common.moods.low"
  | "common.moods.neutral"
  | "common.moods.good"
  | "common.moods.great"
  | "onboarding.steps.s1.title"
  | "onboarding.steps.s1.body"
  | "onboarding.steps.s2.title"
  | "onboarding.steps.s2.body"
  | "onboarding.steps.s3.title"
  | "onboarding.steps.s3.body"
  | "onboarding.steps.s4.title"
  | "onboarding.steps.s4.body"
  | "onboarding.steps.s5.title"
  | "onboarding.steps.s5.body"
  | "coach.meals.placeholder"
  | "coach.meals.ariaSend"
  | "coach.meals.emptyHint"
  | "offlineQueue.retryAria"
  | "offlineQueue.deleteAria"
  | "group.inviteToggleOpen"
  | "group.inviteToggleClose"
  | "group.inviteLoading"
  | "group.inviteEmpty"
  | "recipes.remixSubstitutionLabel"
  | "recipes.remixSubstitutionPlaceholder"
  | "onboarding.health.hint"
  | "fasting.confirmLongTitle"
  | "fasting.confirmLongDesc"
  | "fasting.confirmLongConfirm"
  | "landing.ctaStart"
  | "coach.featDisabled"
  | "coach.featDisabledDesc"
  | "scanLabel.featDisabled"
  | "scanLabel.featDisabledDesc"
  | "scanPhoto.featDisabled"
  | "scanPhoto.featDisabledDesc"
  | "fasting.featDisabled"
  | "admin.articles.title"
  | "admin.articles.loading"
  | "admin.articles.count"
  | "admin.articles.searchPlaceholder"
  | "admin.articles.empty"
  | "admin.articles.published"
  | "admin.articles.draft"
  | "admin.articles.minutesShort"
  | "admin.articles.views"
  | "admin.articles.by"
  | "admin.articles.viewPublic"
  | "admin.articles.unpublish"
  | "admin.articles.publish"
  | "admin.audit.title"
  | "admin.audit.subtitle"
  | "admin.audit.allCount"
  | "admin.audit.categoryCount"
  | "admin.audit.empty"
  | "admin.audit.fieldWhen"
  | "admin.audit.fieldActor"
  | "admin.audit.fieldTarget"
  | "admin.audit.metadata"
  | "admin.audit.close"
  | "admin.index.title"
  | "admin.index.subtitle"
  | "admin.index.lastSync"
  | "admin.index.totalUsers"
  | "admin.index.totalUsersSub"
  | "admin.index.admins"
  | "admin.index.adminsSub"
  | "admin.index.recipes"
  | "admin.index.recipesSub"
  | "admin.index.articles"
  | "admin.index.articlesSub"
  | "admin.index.imageCoverage"
  | "admin.index.imageBackfillHint"
  | "admin.index.recipesByCategory"
  | "admin.index.emptyRecipes"
  | "admin.index.recentRecipes"
  | "admin.index.viewAll"
  | "admin.index.recentUsers"
  | "admin.index.noEmail"
  | "admin.index.joinedDate"
  | "admin.index.never"
  | "admin.index.quickActions"
  | "admin.index.qaGenerateRecipesTitle"
  | "admin.index.qaGenerateRecipesDesc"
  | "admin.index.qaAuditLogTitle"
  | "admin.index.qaAuditLogDesc"
  | "admin.index.qaSystemHealthTitle"
  | "admin.index.qaSystemHealthDesc"
  | "admin.index.loadFail"
  | "admin.index.tryAgain"
  | "admin.index.coverageOf"
  | "admin.index.coverageMissing"
  | "admin.recipes.title"
  | "admin.recipes.loading"
  | "admin.recipes.totalCount"
  | "admin.recipes.searchPlaceholder"
  | "admin.recipes.allCategories"
  | "admin.recipes.catBreakfast"
  | "admin.recipes.catSnack"
  | "admin.recipes.catMain"
  | "admin.recipes.catSup"
  | "admin.recipes.catSayur"
  | "admin.recipes.catLauk"
  | "admin.recipes.catMinuman"
  | "admin.recipes.catSalad"
  | "admin.recipes.colRecipe"
  | "admin.recipes.colCategory"
  | "admin.recipes.colNutrition"
  | "admin.recipes.colStatus"
  | "admin.recipes.colAction"
  | "admin.recipes.published"
  | "admin.recipes.draft"
  | "admin.recipes.empty"
  | "admin.recipes.viewPublic"
  | "admin.recipes.unpublish"
  | "admin.recipes.publish"
  | "admin.recipes.delete"
  | "admin.recipes.pagination"
  | "admin.recipes.nutrition"
  | "admin.recipes.deleteTitle"
  | "admin.recipes.deleteSlug"
  | "admin.recipes.deleteWarning"
  | "admin.recipes.cancel"
  | "admin.seed.title"
  | "admin.seed.generatorTitle"
  | "admin.seed.generatorDesc"
  | "admin.seed.countLabel"
  | "admin.seed.categoryLabel"
  | "admin.seed.categoryPlaceholder"
  | "admin.seed.focusLabel"
  | "admin.seed.focusPlaceholder"
  | "admin.seed.dryRunLabel"
  | "admin.seed.generating"
  | "admin.seed.previewBtn"
  | "admin.seed.generateInsertBtn"
  | "admin.seed.wouldInsert"
  | "admin.seed.inserted"
  | "admin.seed.skipped"
  | "admin.seed.failed"
  | "admin.seed.errorTitle"
  | "admin.system.title"
  | "admin.system.subtitle"
  | "admin.system.lastSync"
  | "admin.system.refresh"
  | "admin.system.application"
  | "admin.system.kvName"
  | "admin.system.kvUrl"
  | "admin.system.kvEnvironment"
  | "admin.system.supabase"
  | "admin.system.kvProject"
  | "admin.system.kvRegion"
  | "admin.system.kvTables"
  | "admin.system.tablesSummary"
  | "admin.system.aiUsage"
  | "admin.system.last24h"
  | "admin.system.last7d"
  | "admin.system.topFeatures"
  | "admin.system.cronJobs"
  | "admin.system.backups"
  | "admin.system.kvLastBackup"
  | "admin.system.kvRetention"
  | "admin.system.kvLocalPath"
  | "admin.system.backupHint"
  | "admin.system.never"
  | "fasting.featDisabledDesc"

  // ── Mood tracker (C2) ───────────────────────────────────────────
  | "mood.howFeel"
  | "mood.notePlaceholder"
  | "mood.trend14"
  | "mood.avgShort"

  // ── Vitals tracker (C2) ──────────────────────────────────────────
  | "vitals.bp"
  | "vitals.hr"
  | "vitals.glucose"
  | "vitals.recordTitle"
  | "vitals.sysLabel"
  | "vitals.diaLabel"
  | "vitals.hrLabel"
  | "vitals.gluLabel"
  | "vitals.stateFasting"
  | "vitals.statePostMeal"
  | "vitals.stateRandom"
  | "vitals.notePlaceholder"
  | "vitals.historyTitle"
  | "vitals.emptyHistory"
  | "vitals.editClose"

  // ── Reminders (C2) ───────────────────────────────────────────────
  | "reminder.active"
  | "reminder.next"
  | "reminder.noneToday"
  | "reminder.namePlaceholder"
  | "reminder.catWater"
  | "reminder.catMeal"
  | "reminder.catWorkout"
  | "reminder.catSleep"
  | "reminder.catMedication"
  | "reminder.catFasting"
  | "reminder.catPrayer"
  | "reminder.catCustom"
  | "reminder.toggle"
  | "reminder.everyDay"
  | "reminder.nDays"

  // ── Scan item card (C2) ──────────────────────────────────────────
  | "scan.editClose"
  | "scan.logAria"
  | "scan.confLowHint"
  | "scan.inDatabase"
  | "scan.portionLabel"
  | "scan.caloriesLabel"
  | "scan.proteinLabel"
  | "scan.carbsLabel"
  | "scan.fatLabel"
  | "scan.auditNote"

  // ── Food detail sheet (C2) ──────────────────────────────────────
  | "food.detailLoading"
  | "food.gi"
  | "food.gl"
  | "food.giLow"
  | "food.giMed"
  | "food.giHigh"
  | "food.giLegend"
  | "food.perServing"
  | "food.otherNutrients"
  | "food.fiber"
  | "food.sugar"
  | "food.satFat"
  | "food.transFat"
  | "food.sodium"
  | "food.cholesterol"
  | "food.vitaminsMinerals"
  | "food.potassium"
  | "food.calcium"
  | "food.iron"
  | "food.vitA"
  | "food.vitC"
  | "food.vitD"
  | "food.servingSizes"
  | "food.defaultServing"
  | "food.mainIngredients"
  | "food.brand"
  | "food.healthScore"
  | "food.allergenWarn"
  | "food.logAsFood"
  | "food.filterAll"

  // ── Food confirmation modal (C2) ────────────────────────────────
  | "food.confirmTitle"
  | "food.confirmEmpty"
  | "food.confirmEmptyHint"
  | "food.confirmSource"
  | "food.confirmWarning"
  | "food.totalEstimate"
  | "food.confHigh"
  | "food.confMed"
  | "food.confLow"
  | "food.macroCalories"
  | "food.macroProtein"
  | "food.macroCarbs"
  | "food.macroFat"
  | "food.macroSugar"
  | "food.macroSodium"
  | "food.matchedDb"
  | "food.savingN"
  | "food.savedN"
  | "food.warnSodium"
  | "food.warnSugar"
  | "food.warnFat"
  | "food.warnCalories"

  // ── Landing chrome (C2) ─────────────────────────────────────────
  | "landing.dashboard"
  | "landing.login"
  | "landing.features"
  | "landing.howItWorks"
  | "landing.testimonials"
  | "landing.faq"
  | "landing.free"
  | "landing.freeForever"
  | "landing.freeFeatures1"
  | "landing.freeFeatures2"
  | "landing.freeFeatures3"
  | "landing.freeFeatures4"
  | "landing.startFree"
  | "landing.premiumSoon"
  | "landing.premiumPrice"
  | "landing.premiumPerMonth"
  | "landing.premiumFeatures1"
  | "landing.premiumFeatures2"
  | "landing.premiumFeatures3"
  | "landing.premiumFeatures4"
  | "landing.notifyMe"
  | "landing.finalCtaTitle"
  | "landing.finalCtaDesc"
  | "landing.finalCtaFree"
  | "landing.finalCtaDb"
  | "landing.finalCtaAi"
  | "landing.stickyPrompt"
  | "landing.copyright"
  | "landing.privacy"
  | "landing.prism"
  | "landing.premiumBadge"

  // Sprint 58-D — promo codes + banners admin + client redemption UI
  | "admin.promo.title"
  | "admin.promo.subtitle"
  | "admin.promo.createBtn"
  | "admin.promo.code"
  | "admin.promo.label"
  | "admin.promo.description"
  | "admin.promo.rewardType"
  | "admin.promo.rewardValue"
  | "admin.promo.maxUses"
  | "admin.promo.usesRemaining"
  | "admin.promo.expiresAt"
  | "admin.promo.active"
  | "admin.promo.empty"
  | "admin.promo.savedOk"
  | "admin.promo.deletedOk"
  | "admin.promo.duplicate"
  | "admin.promo.duplicatedOk"
  | "admin.banners.title"
  | "admin.banners.subtitle"
  | "admin.banners.createBtn"
  | "admin.banners.placement"
  | "admin.banners.title_field"
  | "admin.banners.description"
  | "admin.banners.ctaLabel"
  | "admin.banners.ctaHref"
  | "admin.banners.color"
  | "admin.banners.startsAt"
  | "admin.banners.endsAt"
  | "admin.banners.active"
  | "admin.banners.empty"
  | "admin.banners.savedOk"
  | "admin.banners.deletedOk"
  | "admin.exp.title"
  | "admin.exp.subtitle"
  | "admin.exp.createBtn"
  | "admin.exp.key"
  | "admin.exp.label"
  | "admin.exp.description"
  | "admin.exp.variantA"
  | "admin.exp.variantB"
  | "admin.exp.splitPct"
  | "admin.exp.active"
  | "admin.exp.empty"
  | "admin.exp.savedOk"
  | "admin.exp.deletedOk"
  | "admin.exp.invalidJson"
  | "admin.index.promoStatsTitle"
  | "admin.index.promoTotalCodes"
  | "admin.index.promoActiveCodes"
  | "admin.index.promoRedemptions"
  | "admin.index.promoUnique"
  | "admin.index.qaPromoTitle"
  | "admin.index.qaPromoDesc"
  | "admin.index.qaBannersTitle"
  | "admin.index.qaBannersDesc"
  | "promo.placeholder"
  | "promo.redeemBtn"
  | "promo.redeemOk"
  | "promo.redeemFail";

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
    "common.refresh": "Refresh",
    "common.saving": "Menyimpan\u2026",
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

    // ── progress ──
    "progress.title": "Foto Progres",
    "progress.subtitle": "Pantau perubahan kamu",
    "progress.photoSaved": "Foto progres tersimpan",
    "progress.uploadFailed": "Gagal upload",
    "progress.empty": "Belum ada foto progres",
    "progress.emptyHint": "Foto pertama jadi titik awal — progres bertahap, bukan harus sempurna.",
    "progress.saveFailed": "Gagal simpan",

    // ── achievements ──
    "achievements.title": "Pencapaian",
    "achievements.level": "Level",
    "achievements.xpToLevel": "{xp} XP ke level {next}",
    "achievements.share": "Bagikan pencapaian",
    "achievements.shareTitle": "Pencapaianku di Healthy U",
    "achievements.imageDownloaded": "Gambar diunduh",
    "achievements.imageFailed": "Gagal membuat gambar",
    "achievements.streakLabel": "Streak",
    "achievements.daysUnit": "hari",
    "achievements.longestLabel": "Terpanjang",
    "achievements.badgeCount": "Badge ({unlocked}/{total})",
    "achievements.dayUnit": "hari",

    // ── alarms ──
    "alarms.title": "Smart Alarm",
    "alarms.wakeTime": "Waktu bangun",
    "alarms.windowHint": "Window (menit) — bangun di fase tidur ringan",
    "alarms.saved": "Alarm tersimpan",

    // ── backup ──
    "backup.title": "Backup & Ekspor",
    "backup.downloadAll": "Unduh semua data Anda",
    "backup.downloadAllDesc":
      "Termasuk profil, makanan, latihan, tidur, vital signs, obat, mood, komunitas, dan pencapaian. Data Anda milik Anda — bawa kapan saja.",
    "backup.auditLogged": "Audit logged",
    "backup.allTables": "Semua tabel",
    "backup.generatingJson": "Generating JSON…",
    "backup.downloadJsonFull": "Unduh JSON (lengkap)",
    "backup.generatingCsv": "Generating CSV…",
    "backup.downloadCsv": "Unduh CSV (per tabel)",
    "backup.fileWarning": "File berisi semua data pribadi Anda. Simpan di tempat aman.",
    "backup.exportHistory": "Riwayat Ekspor",
    "backup.entriesCount": "{count} entri",
    "backup.noHistory": "Belum ada riwayat export.",
    "backup.tableUnit": "tabel",
    "backup.rowUnit": "baris",
    "backup.success": "Backup {format} berhasil · {tables} tabel, {rows} baris",
    "backup.failed": "Gagal membuat backup",
    "backup.pdpDisclaimer":
      "Hak Anda (UU PDP No. 27/2022): Anda berhak mengakses, mengoreksi, menghapus, dan membatasi pemrosesan data pribadi Anda. Semua ekspor dicatat untuk transparansi dan kepatuhan.",
    "backup.justNow": "baru saja",
    "backup.minutesAgo": "{n} menit lalu",
    "backup.hoursAgo": "{n} jam lalu",
    "backup.daysAgo": "{n} hari lalu",

    // ── googleCalendar ──
    "googleCalendar.title": "Google Calendar",
    "googleCalendar.syncHint": "Sinkronkan jadwal workout & meal kamu ke Google Calendar.",
    "googleCalendar.connect": "Connect Google Calendar",
    "googleCalendar.oauthConfig": "OAuth Google Calendar akan dikonfigurasi (perlu CLIENT_ID)",

    // ── challenges ──
    "challenges.title": "Challenges",
    "challenges.empty": "Belum ada challenge",
    "challenges.emptyDesc": "Challenge baru akan dirilis berkala.",
    "challenges.alreadyJoined": "Sudah bergabung",
    "challenges.joined": "Bergabung challenge!",
    "challenges.alreadyJoinedAnnounce": "Sudah bergabung challenge {title}",
    "challenges.joinedAnnounce": "Bergabung challenge {title}",
    "challenges.dayLogged": "Hari {day} tercatat · streak {streak}",
    "challenges.left": "Keluar dari challenge",
    "challenges.continueChallenge": "Lanjutkan tantangan",
    "challenges.dayLabel": "Hari {day}",

    // ── community ──
    "community.postUnit": "post",
    "community.categoryAll": "Semua",

    // ── onboarding ──
    "onboarding.saveFailed": "Gagal simpan",

    // ── referrals ──
    "referrals.title": "Ajak Teman",
    "referrals.yourCode": "Kode Kamu",
    "referrals.shareHint":
      "Bagikan kode ini. Setiap teman yang gabung kamu dapat 100 koin, mereka dapat 50 koin.",
    "referrals.copy": "Salin",
    "referrals.shareButton": "Bagikan",
    "referrals.invited": "Diajak",
    "referrals.completed": "Selesai",
    "referrals.coins": "Koin",
    "referrals.hasCode": "Punya kode dari teman?",
    "referrals.singleUse": "Masukkan sekali saja, dapat 50 koin bonus.",
    "referrals.apply": "Pakai",
    "referrals.appliedSuccess": "Berhasil! +{earned} koin",
    "referrals.codeCopied": "Kode disalin",
    "referrals.linkCopied": "Link disalin",
    "referrals.codePlaceholder": "KODE TEMAN",
    "referrals.shareMessage":
      "Yuk gabung HealthyU! Pakai kode {code} dan dapatkan 50 koin bonus 🎁 {url}",

    // ── reminders ──
    "reminders.soon": "segera",
    "reminders.countdownHm": "{h}j {m}m lagi",
    "reminders.countdownM": "{m}m lagi",

    // ── subscription ──
    "subscription.title": "Subscription",
    "subscription.currently": "Saat ini:",
    "subscription.active": "Aktif",
    "subscription.select": "Pilih",
    "subscription.upgraded": "Berhasil upgrade",

    // ── notifications ──
    "notifications.title": "Notifikasi",
    "notifications.subtitle": "Aktivitas terbaru untuk kamu",

    // ── mealplan ──
    "mealplan.title": "Meal Plan",
    "mealplan.subtitle": "Rencanakan menu seminggu",
    "mealplan.weekView": "Tampilan Mingguan",
    "mealplan.weekViewDesc": "Lihat 7 hari + adherence + swap meal",
    "mealplan.dayView": "Tampilan Hari",
    "mealplan.generateAI": "Generate AI",
    "mealplan.budgetTitle": "Meal Plan Budget",
    "mealplan.budgetLabel": "Budget total (Rp)",
    "mealplan.budgetDays": "Berapa hari",
    "mealplan.aiGenerating": "AI menyusun…",
    "mealplan.generatePlan": "Generate Plan",
    "mealplan.dayLabel": "Hari {day}",
    "mealplan.groceryTitle": "Grocery List",
    "mealplan.groceryCount": "{count} item",
    "mealplan.planAdded": "Rencana ditambahkan",
    "mealplan.weeklyTitle": "Meal Plan Mingguan",
    "mealplan.weeklySubtitle": "Atur & pantau adherence plan 7 hari",

    // ── meals ──
    "meals.detailTitle": "Detail Menu",
    "meals.ingredientsLabel": "Bahan ({servings}x)",
    "meals.cookingSteps": "Cara Masak",
    "meals.alternatives": "Alternatif",
    "meals.addToDiary": "Tambah ke Diary",
    "meals.addedToDiary": "Ditambahkan {servings} porsi ke diary",
    "meals.linkCopied": "Link disalin",
    "meals.parseError": "Gagal parse makanan",
    "meals.voiceParseError": "Gagal parse suara",
    "meals.syncPending": "Sync {pending}",

    // ── recommendations ──
    "recommendations.title": "Rekomendasi AI",
    "recommendations.subtitle": "Meal plan personal sesuai profil & sisa kalori",
    "recommendations.notesLabel": "Catatan khusus (opsional)",
    "recommendations.notesPlaceholder": "cth: ingin yang tinggi protein, mau cepat masak...",
    "recommendations.generating": "Menyusun rekomendasi...",
    "recommendations.generateButton": "Buat Rekomendasi",
    "recommendations.aiBadge": "AI Personal",
    "recommendations.templateBadge": "📋 Template (estimasi)",
    "recommendations.budgetRemaining": "Sisa budget:",
    "recommendations.totalPlan": "Total rencana:",
    "recommendations.aiUnavailable": "AI tidak tersedia. Coba paksa AI lagi?",
    "recommendations.forceAiRetry": "Coba AI lagi",
    "recommendations.saveToMealPlan": "Simpan ke Meal Plan Hari Ini",
    "recommendations.saved": "Rekomendasi disimpan ke meal plan hari ini",
    "recommendations.saveError": "Gagal simpan",
    "recommendations.noRecommendation": "Belum ada rekomendasi",
    "recommendations.aiNotAvailable": "AI masih tidak tersedia. Coba lagi sebentar lagi.",

    // ── reverseCalorie ──
    "reverseCalorie.title": "Cari Menu by Kalori",
    "reverseCalorie.targetLabel": "Target kalori",
    "reverseCalorie.searchButton": "Cari",

    // ── shopping ──
    "shopping.smartTitle": "Daftar Belanja Pintar",
    "shopping.smartPlaceholder": "Tempel meal plan kamu...",
    "shopping.smartGenerating": "Membuat...",
    "shopping.smartGenerate": "Generate",
    "shopping.deriveTitle": "Belanja dari Meal Plan",
    "shopping.deriveSubtitle": "Auto-derive mingguan",
    "shopping.deriveFromPlan": "Diturunkan dari meal plan 7 hari",
    "shopping.deriveProgress": "{done}/{total} item sudah dicentang",
    "shopping.deriveManual": "Manual",
    "shopping.deriveDownloaded": "Daftar belanja diunduh",
    "shopping.deriveSaveShare": "Simpan / Bagikan",
    "shopping.listTitle": "Smart Shopping List",
    "shopping.listPlaceholder": "1 bahan per baris...",
    "shopping.listEstimatePrice": "Estimasi Harga",

    // ── restaurants ──
    "restaurants.nearbyTitle": "Restoran Terdekat",
    "restaurants.searchNearby": "Cari di sekitar saya",
    "restaurants.pressToSearch": "Tekan tombol untuk mencari",

    // ── foods ──
    "foods.filterCount": "{count} filter",
    "foods.filterLabel": "filter",

    // ── pet ──
    "pet.title": "Virtual Pet",
    "pet.adoptTitle": "Adopsi pet kamu",
    "pet.adoptDesc": "Pet akan tumbuh seiring kebiasaan sehatmu.",
    "pet.namePlaceholder": "Nama pet",
    "pet.adoptBtn": "Adopsi",
    "pet.adoptedToast": "Pet diadopsi!",
    "pet.healthLabel": "Health",
    "pet.happinessLabel": "Happiness",
    "pet.energyLabel": "Energy",
    "pet.hungerLabel": "Hunger",
    "pet.feedBtn": "Beri makan",
    "pet.playBtn": "Main",
    "pet.restBtn": "Istirahat",
    "pet.levelExp": "Lv {stage} · {exp} EXP",
    "pet.expToNext": "{exp} EXP menuju Lv {stage}",
    "pet.evolution.title": "Pet Evolution",
    "pet.evolution.stages.egg": "Telur",
    "pet.evolution.stages.hatchling": "Tukik",
    "pet.evolution.stages.child": "Anak",
    "pet.evolution.stages.teen": "Remaja",
    "pet.evolution.stages.adult": "Dewasa",
    "pet.evolution.stageProgress": "Stage {n}/{total} · {xp} XP",
    "pet.evolution.xpNeeded": "Butuh {xp} XP lagi ke {name}",
    "pet.evolution.peakForm": "Form puncak tercapai!",
    "pet.evolution.evolveBtn": "Evolve!",
    "pet.evolution.restartBtn": "Mulai Lagi",
    "pet.shop.title": "Toko Aksesori Pet",
    "pet.shop.bought": "Dibeli!",
    "pet.shop.equipped": "Dipakai",
    "pet.shop.equip": "Pakai",
    "pet.shop.buy": "Beli {cost} coin",
    "pet.svg.title": "Evolusi Pet",
    "pet.svg.stageLabel": "Tahap evolusi",
    "pet.svg.stageProgress": "Tahap {n}/{total}",

    // ── gacha ──
    "gacha.title": "Gacha Reward",
    "gacha.spin": "Putar Gacha",
    "gacha.costHint": "Biaya 20 coin. Bisa dapat 0–200 coin acak. Jackpot 2%!",
    "gacha.spinning": "Memutar...",
    "gacha.pullBtn": "Pull (20 coin)",
    "gacha.result": "🎉 Hasil: {label}",

    // ── rewards ──
    "rewards.title": "Tukar Koin",
    "rewards.subtitle": "Marketplace reward partner",
    "rewards.outOfStock": "Habis",
    "rewards.notEnough": "Kurang",
    "rewards.redeem": "Tukar",
    "rewards.empty": "Belum ada reward.",
    "rewards.historyTitle": "Riwayat Penukaran",
    "rewards.redeemed": "Berhasil ditukar! Sisa koin: {coins}",
    "rewards.failed": "Gagal",

    // ── currency ──
    "currency.title": "Konversi Mata Uang",
    "currency.convertBtn": "Konversi",

    // ── loginBonus ──
    "loginBonus.title": "Bonus Harian",
    "loginBonus.desc": "Klaim bonus harianmu. Makin lama streak, makin besar reward!",
    "loginBonus.claiming": "Mengklaim…",
    "loginBonus.claimBtn": "Klaim Bonus",
    "loginBonus.alreadyClaimed": "Sudah klaim hari ini ({coins} coin, streak {streak})",
    "loginBonus.claimed": "+{coins} coin! Streak: {streak}",

    // ── streakFreeze ──
    "streakFreeze.title": "Streak Freeze",
    "streakFreeze.desc": "Lupa log hari ini? Gunakan freeze untuk menyelamatkan streakmu.",
    "streakFreeze.used": "✓ Freeze Digunakan",
    "streakFreeze.useBtn": "Gunakan 1 Freeze",

    // ── quiz ──
    "quiz.title": "Kuis Harian",
    "quiz.quoteToday": "Quote Hari Ini",
    "quiz.question": "Pertanyaan",
    "quiz.correct": "Benar! +{coins} coin",
    "quiz.wrong": "Salah, coba lagi besok",

    // ── stories ──
    "stories.title": "Meal Stories",
    "stories.placeholder": "Tulis story makanan hari ini…",
    "stories.posted": "Story diposting",
    "stories.loading": "Memuat…",
    "stories.unknownUser": "User",
    "stories.imageAlt": "Story image",
    "stories.empty": "Belum ada story aktif. Follow teman untuk lihat feed mereka.",

    // ── groups ──
    "groups.title": "Grup Teman",
    "groups.subtitle": "Leaderboard privat bersama teman",
    "groups.createTitle": "Buat grup baru",
    "groups.createPlaceholder": "Nama grup (mis. Keluarga Sehat)",
    "groups.createBtn": "Buat Grup",
    "groups.creating": "Membuat...",
    "groups.joinTitle": "Gabung dengan kode",
    "groups.joinPlaceholder": "Kode undangan (6 huruf)",
    "groups.joinBtn": "Gabung",
    "groups.joining": "Bergabung...",
    "groups.myGroups": "Grup Saya",
    "groups.loading": "Memuat...",
    "groups.empty": "Belum ada grup. Buat baru atau gabung dengan kode.",
    "groups.created": "Grup dibuat. Kode: {code}",
    "groups.joined": "Bergabung ke {name}",
    "groups.createFailed": "Gagal membuat grup",
    "groups.joinFailed": "Gagal bergabung",

    // ── leaderboard ──
    "leaderboard.title": "Leaderboard",
    "leaderboard.subtitle": "Top 50 berdasarkan XP",
    "leaderboard.loading": "Memuat...",
    "leaderboard.you": " (Kamu)",
    "leaderboard.level": "Lvl {level}",
    "leaderboard.xp": "XP",
    "leaderboard.empty": "Belum ada data",

    // ── leaderboardWeekly ──
    "leaderboardWeekly.title": "Leaderboard Mingguan",

    // ── discover ──
    "discover.title": "Cari Teman",
    "discover.subtitle": "Temukan orang dengan goals serupa",
    "discover.publicCommunity": "Komunitas publik",
    "discover.seeAllPosts": "Lihat semua post dari semua user",

    // ── heatmap ──
    "heatmap.title": "Heatmap Tahunan",
    "heatmap.last365": "365 hari terakhir",
    "heatmap.mealTooltip": "{date}: {n} meal",

    // ── insights ──
    "insights.title": "Insight AI",
    "insights.badge": "AI Insight · 7 hari",
    "insights.refresh": "Perbarui",
    "insights.tipsForYou": "Tips untuk kamu",
    "insights.sameAsYesterday": "Sama seperti kemarin",
    "insights.share": "Bagikan",
    "insights.notFound": "Tidak ditemukan",
    "insights.copiedMeals": "{n} meal disalin dari kemarin",
    "insights.noMealsYesterday": "Tidak ada meal kemarin",
    "insights.clipboardCopied": "Disalin ke clipboard",
    "insights.shareTitle": "HealthyU Insight",

    // ── charity ──
    "charity.title": "Donasi Coin",
    "charity.donateBtn": "Donasi {coins} Coin",
    "charity.thanks": "Terima kasih! {coins} coin disumbang ke {charity}",

    // ── family ──
    "family.title": "Family Plan",
    "family.createTitle": "Buat Plan Keluarga",
    "family.namePlaceholder": "Nama plan (cth: Keluarga Setiawan)",
    "family.createBtn": "Buat",
    "family.activePlan": "Plan aktif",
    "family.createdToast": "Family plan dibuat",
    "admin.config.title": "App Config",
    "admin.config.subtitle": "Edit runtime config. Changes apply immediately. Audit-logged.",
    "admin.config.backToAdmin": "Kembali ke Admin",
    "admin.config.empty": "Belum ada config key untuk filter ini.",
    "admin.config.savedOk": "Tersimpan. Cache akan refresh dalam 60 detik.",
    "admin.config.deletedOk": "Dihapus. Default code value akan dipakai.",
    "admin.config.value": "Value",
    "admin.i18n.title": "Translation Editor",
    "admin.i18n.subtitle": "Edit copy in-DB tanpa redeploy. Override beats bundled.",
    "admin.i18n.searchPlaceholder": "Cari translation key...",
    "admin.i18n.filterAll": "Semua",
    "admin.i18n.filterOverridden": "Overridden",
    "admin.i18n.filterDefault": "Default",
    "admin.i18n.empty": "Tidak ada key yang cocok.",
    "admin.i18n.selectKeyPrompt": "Pilih translation key di sebelah kiri untuk mulai mengedit.",
    "admin.i18n.savedOk": "Tersimpan. Cache refresh dalam 5 menit.",
    "admin.i18n.revertedOk": "Override dihapus. Kembali ke bundled value.",
    "admin.i18n.overriddenBadge": "Edited",
    "admin.i18n.revert": "Revert",
    "admin.i18n.saveId": "Simpan (ID)",
    "admin.i18n.saveEn": "Simpan (EN)",
    "admin.notif.title": "Notification Templates",
    "admin.notif.subtitle":
      "Edit subject/body email dan judul push notifikasi tanpa code deploy. Variabel: {nama_var}.",
    "admin.notif.channel": "Channel",
    "admin.notif.channelAll": "Semua",
    "admin.notif.channelEmail": "Email",
    "admin.notif.channelPush": "Push",
    "admin.notif.localeAll": "Semua locale",
    "admin.notif.empty": "Belum ada template.",
    "admin.notif.searchPlaceholder": "Cari template key...",
    "admin.notif.templateKey": "Template Key",
    "admin.notif.subject": "Subject / Title",
    "admin.notif.bodyText": "Body (Text)",
    "admin.notif.bodyHtml": "Body (HTML)",
    "admin.notif.variables": "Variabel",
    "admin.notif.variablesHint": "Pisah dengan koma. Contoh: user_name, pattern_count",
    "admin.notif.isActive": "Aktif",
    "admin.notif.preview": "Preview",
    "admin.notif.previewRendered": "Hasil render",
    "admin.notif.previewSampleVars": "Sample variabel (key=value, pisah koma)",
    "admin.notif.previewHint":
      "Contoh: user_name=Andi, pattern_count=12. Placeholder {user_name} akan diganti.",
    "admin.notif.save": "Simpan",
    "admin.notif.cancel": "Batal",
    "admin.notif.delete": "Hapus",
    "admin.notif.savedOk": "Template tersimpan.",
    "admin.notif.deletedOk": "Template dihapus.",
    "admin.notif.disabledBadge": "Disabled",
    "admin.notif.toggleEnable": "Aktifkan",
    "admin.notif.toggleDisable": "Nonaktifkan",
    "admin.notif.confirmDelete": "Hapus template ini?",
    "admin.notif.fallbackHint": "Locale 'en' akan fallback ke 'id' kalau tidak ada.",
    "admin.notif.updatedAt": "Diperbarui",
    "privacyPolicy.section1UserItems.akun":
      "email, nama tampilan, foto profil (jika diunggah), preferensi publik.",
    "privacyPolicy.section1UserItems.profil":
      "tanggal lahir, jenis kelamin, tinggi, berat, alergi, kondisi kesehatan yang Anda catat sendiri.",
    "privacyPolicy.section1UserItems.log":
      "makanan, minuman, olahraga, tidur, berat, mood, obat, catatan, foto progres.",
    "privacyPolicy.section1UserItems.komunitas":
      "posting, komentar, dan interaksi (like, simpan) yang Anda buat di fitur komunitas.",
    "privacyPolicy.section1UserItems.ai": "pesan yang Anda kirim ke AI coach.",
    "privacyPolicy.section1AutoItems.auth": "token sesi, refresh token (Supabase Auth).",
    "privacyPolicy.section1AutoItems.notif":
      "endpoint push subscription (VAPID) untuk kirim pengingat.",
    "privacyPolicy.section1AutoItems.wearable":
      "token koneksi ke Google Fit, jika Anda menghubungkan perangkat.",
    "privacyPolicy.section1AutoItems.logs": "error report anonim, metrik performa (tanpa PII).",
    "privacyPolicy.section2Item.summary":
      "Menampilkan kembali ringkasan, grafik, dan tren kesehatan Anda.",
    "privacyPolicy.section2Item.recommend":
      "Mengirimkan rekomendasi personal (AI coach, rekomendasi olahraga, dll).",
    "privacyPolicy.section2Item.notif":
      "Mengirim notifikasi yang Anda daftarkan (pengingat minum, jadwal puasa, dst).",
    "privacyPolicy.section2Item.audit":
      'Audit kualitas model AI — hanya jika Anda mengaktifkan toggle "Bantu tingkatkan AI" di halaman privasi.',
    "privacyPolicy.section2NoTargeted":
      "Kami tidak menggunakan data Anda untuk iklan bertarget atau dibagikan ke pengiklan.",
    "privacyPolicy.section4ActiveAccount": "Akun aktif",
    "scan.label.resultsTitle": "Hasil Scan",
    "scan.label.fieldsDetected": "{matched}/{total} field terdeteksi",
    "scan.label.noServingSize": "Tanpa takaran saji",
    "scan.label.energy": "Energi",
    "scan.label.protein": "Protein",
    "scan.label.carbs": "Karbohidrat",
    "scan.label.sugar": "Gula",
    "scan.label.fatTotal": "Lemak Total",
    "scan.label.fatSat": "Lemak Jenuh",
    "scan.label.fatTrans": "Lemak Trans",
    "scan.label.fiber": "Serat",
    "scan.label.sodium": "Natrium",
    "scan.label.cholesterol": "Kolesterol",
    "scan.label.kcal": "kkal",
    "scan.label.confidenceAccurate": "Akurat",
    "scan.label.confidenceLow": "Kurang yakin",
    "scan.label.confidenceMedium": "Cukup",
    "articles.shareFallback": "Artikel HealthyU",
    "backup.pdpDisclaimerTitle": "Hak Anda (UU PDP No. 27/2022):",
    "backup.pdpDisclaimerBody":
      "Anda berhak mengakses, mengoreksi, menghapus, dan membatasi pemrosesan data pribadi Anda. Semua ekspor dicatat untuk transparansi dan kepatuhan.",
    "privacy.openSettings": "Buka pengaturan",
    "privacy.toggleAudit": "Toggle audit",
    "privacy.togglePiiRedact": "Toggle PII redaction",
    "privacy.policyLinkTitle": "Kebijakan Privasi",
    "privacyPolicy.title": "Kebijakan Privasi",
    "privacyPolicy.lastUpdated": "Terakhir diperbarui: {date} · Merujuk pada UU PDP No. 27/2022",
    "privacyPolicy.summaryTitle": "Ringkasan singkat",
    "privacyPolicy.summaryLead":
      "HealthyU adalah aplikasi catatan kesehatan pribadi. Kami hanya mengumpulkan data yang Anda berikan secara sadar (profil, log makanan, olahraga, tidur, dll) untuk menampilkan kembali informasi tersebut kepada Anda. Kami **tidak menjual data Anda** ke pihak ketiga.",
    "privacyPolicy.section1Title": "1. Data yang kami kumpulkan",
    "privacyPolicy.section1UserTitle": "Data yang Anda berikan",
    "privacyPolicy.section1AutoTitle": "Data yang dikumpulkan otomatis",
    "privacyPolicy.section2Title": "2. Untuk apa data digunakan",
    "privacyPolicy.section3Title": "3. Siapa yang menerima data",
    "privacyPolicy.section4Title": "4. Periode retensi",
    "privacyPolicy.section5Title": "5. Hak-hak Anda (UU PDP Pasal 5–12)",
    "privacyPolicy.section5Intro": "Anda berhak untuk:",
    "privacyPolicy.rightAccessTitle": "Melihat & mengakses",
    "privacyPolicy.rightAccessDesc": "Lihat semua data pribadi Anda yang kami simpan.",
    "privacyPolicy.rightAccessAction": "Privasi saya",
    "privacyPolicy.rightCopyTitle": "Mendapatkan salinan",
    "privacyPolicy.rightCopyDesc": "Ekspor seluruh data Anda dalam format JSON atau CSV.",
    "privacyPolicy.rightCopyAction": "Unduh data",
    "privacyPolicy.rightFixTitle": "Memperbaiki",
    "privacyPolicy.rightFixDesc": "Perbarui data yang tidak akurat di halaman profil.",
    "privacyPolicy.rightFixAction": "Edit profil",
    "privacyPolicy.rightDeleteTitle": "Menghapus akun",
    "privacyPolicy.rightDeleteDesc": "Hapus permanen akun & semua data Anda.",
    "privacyPolicy.rightDeleteAction": "Hapus akun",
    "privacyPolicy.section5After":
      "Setiap permintaan dieksekusi maksimal **7×24 jam** setelah permintaan diverifikasi. Permintaan yang terkait kewajiban hukum (mis. log audit yang sudah kadaluarsa) akan dijelaskan alasannya.",
    "privacyPolicy.section6Title": "6. Keamanan",
    "privacyPolicy.section7Title": "7. Anak di bawah umur",
    "privacyPolicy.section7Body":
      "HealthyU tidak ditujukan untuk anak di bawah 13 tahun. Kami tidak dengan sengaja mengumpulkan data anak di bawah batas usia tersebut. Orang tua/wali yang khawatir dapat menghubungi kami untuk meminta penghapusan data.",
    "privacyPolicy.section8Title": "8. Kontak & pengaduan",
    "privacyPolicy.section8Intro":
      "Untuk pertanyaan, permintaan akses data, atau pengaduan privasi:",
    "privacyPolicy.section8EmailLabel": "Email:",
    "privacyPolicy.section8After":
      "Jika Anda merasa keluhan tidak ditangani dengan baik, Anda berhak mengajukan pengaduan ke otoritas perlindungan data pribadi Indonesia (kominfo).",
    "privacyPolicy.section9Title": "9. Perubahan kebijakan",
    "privacyPolicy.section9Body":
      "Kami akan memberi tahu Anda melalui notifikasi aplikasi jika ada perubahan material pada kebijakan ini. Versi sebelumnya akan tetap tersedia di histori publik halaman ini.",
    "privacyPolicy.footer":
      "Halaman ini bersifat publik. Untuk tindakan (lihat, unduh, edit, hapus data) silakan masuk ke aplikasi.",
    "privacyPolicy.publicNotice":
      "Halaman ini bersifat publik. Untuk tindakan (lihat, unduh, edit, hapus data) silakan masuk ke aplikasi.",
    "backup.historyMeta": "{tables} tabel · {rows} baris",
    "body.title": "Body Composition",
    "body.tabs.weight": "Berat",
    "body.tabs.measurements": "Ukuran",
    "body.tabs.photo": "Foto",
    "body.tabs.vitals": "Vitals",
    "body.weightChart": "Grafik berat",
    "body.weightGoal": "Atur target",
    "body.measurements.waist": "Lingkar pinggang",
    "body.measurements.chest": "Lingkar dada",
    "body.measurements.arm": "Lingkar lengan",
    "body.measurements.thigh": "Lingkar paha",
    "body.measurementsHint": "Catat tiap minggu untuk lihat progres komposisi tubuh.",
    "body.photo.addProgress": "Tambah foto progres",
    "body.photo.angles": "Depan · Samping · Belakang",
    "body.photo.upload": "Unggah foto",
    "body.vitals.bloodPressure": "Tekanan darah",
    "body.vitals.heartRate": "Detak jantung",
    "body.vitals.bodyTemp": "Suhu tubuh",
    "body.vitals.spo2": "SpO₂",
    "body.vitalsLogLink": "Catat vitals",
    "patternSettings.title": "Pengaturan Deteksi Pola",
    "patternSettings.subtitle": "Sesuaikan sensitivitas deteksi pola makan sesuai preferensi Anda",
    "patternSettings.skipBreakfastLabel": "Lewati Sarapan",
    "patternSettings.daysPerWeek": "{n} hari/minggu",
    "patternSettings.skipBreakfastDesc":
      "Minimal hari per minggu untuk dianggap melewatkan sarapan",
    "patternSettings.lateNightDinnerLabel": "Jam Makan Malam Terlambat",
    "patternSettings.lateNightDesc": "Jam mulai “makan malam terlambat”",
    "patternSettings.irregularVarianceLabel": "Variasi Jam Makan Tidak Teratur",
    "patternSettings.hoursUnit": "±{n} jam",
    "patternSettings.irregularDesc": "Toleransi deviasi standar dari pola makan normal",
    "patternSettings.thresholdTitle": "Threshold Pola",
    "patternSettings.thresholdDesc": "Atur batas minimal untuk mendeteksi pola tertentu",
    "patternSettings.sensitivityTitle": "Sensitivitas Deteksi",
    "patternSettings.sensitivityDesc": "Seberapa sering pola dilaporkan",
    "patternSettings.sensitivityLabel": "Tingkat Sensitivitas",
    "patternSettings.sensitivity.low": "Rendah (hanya pola kuat)",
    "patternSettings.sensitivity.medium": "Sedang (default)",
    "patternSettings.sensitivity.high": "Tinggi (semua pola terdeteksi)",
    "patternSettings.sensitivityHint":
      "Sensitivitas rendah = lebih sedikit notifikasi, hanya pola yang sangat jelas",
    "patternSettings.saveButton": "Simpan Pengaturan",
    "patternSettings.savingButton": "Menyimpan...",
    "patternSettings.resetButton": "Reset ke Default",
    "patternSettings.savedAlert": "✅ Pengaturan pola tersimpan",
    "patternSettings.errorAlert": "❌ Error: {msg}",
    "articles.title": "Artikel Kesehatan",
    "articles.navTitle": "Artikel",
    "articles.savedFilter": "★ Disimpan",
    "articles.empty": "Belum ada artikel",
    "articles.emptyDesc": "Artikel kesehatan baru akan muncul di sini.",
    "articles.noResults": "Tidak ada hasil",
    "articles.noResultsDesc": "Coba pilih kategori lain.",
    "articles.byline": "oleh {name}",
    "articles.unbookmark": "Hapus bookmark",
    "articles.bookmark": "Simpan bookmark",
    "articles.readingTime": "{n} menit baca",
    "articles.share.trigger": "Bagikan",
    "articles.share.dialogTitle": "Artikel HealthyU",
    "articles.share.dialogText": "Baca artikel sehat ini di HealthyU",
    "articles.linkCopied": "Link disalin",
    "articles.loadError": "Artikel tidak bisa dimuat",
    "articles.loadErrorDesc": "Cek koneksi lalu coba lagi.",
    "articles.notFound": "Artikel tidak ditemukan",
    "articles.notFoundDesc": "Artikel ini mungkin sudah tidak tersedia.",
    "articles.contentMissing": "Konten artikel belum tersedia.",
    "articles.takeaway":
      "Coba hari ini: pilih satu ide praktis dari artikel ini, terapkan di makan berikutnya.",
    "articles.relatedTitle": "Artikel terkait",
    "articles.loadFailImage": "Gagal membuat gambar",
    "sleep.diaryTitle": "Sleep Diary",
    "sleep.diaryTonight": "Tidur malam ini",
    "sleep.diaryHours": "jam",
    "sleep.diaryBedtimeLabel": "Jam tidur",
    "sleep.diaryWakeLabel": "Jam bangun",
    "sleep.diaryNotePlaceholder": "Catatan (mimpi, gangguan, dll)…",
    "sleep.diaryAvgQuality": "Kualitas rata-rata",
    "sleep.diaryHistory": "Riwayat",
    "scan.fridgeTitle": "Resep dari Kulkas",
    "scan.label.title": "Scan Label Nutrisi",
    "scan.label.subtitle": "Client-side OCR · tanpa upload",
    "scan.label.takePhoto": "Ambil Foto Label",
    "scan.label.gallery": "Pilih dari Galeri",
    "scan.label.clientScan": "Scan Client OCR (Offline)",
    "scan.label.aiVision": "AI Vision (Lebih Akurat)",
    "scan.label.noOcrBrowser":
      "Browser tidak support client OCR. Pakai AI Vision untuk hasil lebih akurat.",
    "scan.label.changePhoto": "Ganti Foto",
    "scan.label.processing": "Memproses…",
    "scan.label.progressStatus": "{pct}%",
    "scan.label.enginePreparing": "Mempersiapkan engine OCR…",
    "scan.label.engineInitializing": "Inisialisasi engine…",
    "scan.label.engineReading": "Membaca teks dari gambar…",
    "scan.label.engineDone": "Selesai",
    "scan.label.ocrNotSupported": "Browser tidak mendukung OCR. Gunakan AI fallback.",
    "scan.label.aiVisionPending": "Mengirim gambar ke AI Vision…",
    "scan.label.offlineSupported":
      "Scan berjalan 100% di perangkat. Gambar label tidak di-upload kecuali Anda pilih AI fallback.",
    "scan.label.offlineNoSupport":
      "Browser tidak support client OCR. Pakai AI fallback (perlu internet).",
    "scan.label.tryAi": "Coba AI (Parser Teks) untuk Akurasi",
    "scan.label.mealLogTitle": "Simpan ke meal log",
    "scan.label.mealTypes.breakfast": "Sarapan",
    "scan.label.mealTypes.lunch": "Siang",
    "scan.label.mealTypes.dinner": "Malam",
    "scan.label.mealTypes.snack": "Snack",
    "scan.label.savedAs.breakfast": "Simpan sebagai sarapan",
    "scan.label.savedAs.lunch": "Simpan sebagai makan siang",
    "scan.label.savedAs.dinner": "Simpan sebagai makan malam",
    "scan.label.savedAs.snack": "Simpan sebagai snack",
    "scan.label.servingDefault": "1 takaran saji",
    "scan.label.scanAnother": "Scan Label Lain",
    "scan.label.aiParsing": "AI sedang parsing teks OCR…",
    "scan.label.aiParsingHint":
      "Mengirim teks hasil OCR (gambar tetap di perangkat). Butuh ~3-5 detik.",
    "scan.label.aiVisionReading": "AI Vision sedang membaca label…",
    "scan.label.aiVisionHint": "Mengirim gambar ke Gemini. Butuh ~5-10 detik.",
    "scan.label.aiSuccess": "Selesai dibaca AI",
    "scan.label.aiFailed": "AI OCR gagal",
    "scan.label.altText": "Label nutrisi",
    "scan.label.lowConfidenceHint":
      "Teks terbaca (confidence {pct}%). Pertimbangkan AI fallback untuk hasil lebih akurat.",
    "scan.label.matchedFields": "Berhasil! {matched}/{total} field terdeteksi.",
    "scan.label.ocrFailed": "OCR gagal: {msg}. Coba AI fallback.",
    "scan.label.saveToMealLogSuccess": "Tersimpan ke meal log!",
    "scan.label.saveFailed": "Gagal simpan",
    "scan.label.readFailedFallback": "Gagal membaca label nutrisi",
    "scan.label.detectedFallback": "Label terdeteksi",
    "admin.users.banTitle": "Ban user",
    "admin.users.banReason": "Alasan ban",
    "admin.users.banReasonPlaceholder": "Misalnya: spam, abusive language, ToS violation…",
    "admin.users.banConfirm": "Ban {{email}}? Mereka tidak akan bisa login.",
    "admin.users.unbanConfirm": "Unban {{email}}? Mereka akan bisa login lagi.",
    "admin.users.forceLogoutConfirm": "Force logout {{email}}? Sesi aktif akan di-invalidate.",
    "admin.users.banAction": "Ban",
    "admin.users.unbanAction": "Unban",
    "admin.users.forceLogoutAction": "Force logout",
    "admin.users.details": "Detail",
    "admin.users.bannedSuccess": "{{email}} di-ban.",
    "admin.users.unbannedSuccess": "{{email}} di-unban.",
    "admin.users.forceLogoutSuccess": "{{email}} akan di-force logout.",
    "admin.users.bannedBy": "Di-ban {{date}} — {{reason}}",
    "admin.users.neverBanned": "Tidak di-ban",
    "admin.users.recentActivity": "Aktivitas terbaru (audit log)",
    "admin.users.noActivity": "Belum ada aktivitas tercatat.",
    "admin.users.detailTitle": "Detail user",
    "admin.users.detailClose": "Tutup",
    "admin.users.roleAdmin": "Admin",
    "admin.users.roleModerator": "Moderator",
    "admin.users.roleUser": "User",
    "admin.users.detailLoadFail": "Gagal memuat detail user.",
    "admin.users.confirmYes": "Ya, lanjutkan",
    "admin.users.confirmNo": "Batal",
    "admin.users.featFlagsTitle": "Feature flags (live)",
    "admin.users.featFlagsDesc": "Di-toggle dari /admin/config. Cache 60s.",
    "admin.users.featFlagEnabled": "ON",
    "admin.users.featFlagDisabled": "OFF",
    "common.featDisabled": "Fitur ini sedang nonaktif",
    "common.featDisabledDesc":
      "Admin sedang mematikan fitur ini sementara. Silakan coba lagi nanti.",
    "common.featDisabledBack": "Kembali ke beranda",
    "common.next": "Lanjut",
    "common.start": "Mulai",
    "common.skip": "Lewati",
    "common.edit": "Edit",
    "common.send": "Kirim",
    "common.processing": "Memproses…",
    "common.thinking": "Berpikir…",
    "common.previous": "Sebelumnya",
    "common.dashboard": "Dashboard",
    "common.moods.bad": "Buruk",
    "common.moods.low": "Kurang",
    "common.moods.neutral": "Biasa",
    "common.moods.good": "Baik",
    "common.moods.great": "Hebat",
    "onboarding.steps.s1.title": "Selamat datang",
    "onboarding.steps.s1.body": "Mari mulai perjalanan sehatmu bersama HealthyU.",
    "onboarding.steps.s2.title": "Tetapkan target",
    "onboarding.steps.s2.body": "Berat, kalori, dan kebiasaan harian dapat disesuaikan kapan saja.",
    "onboarding.steps.s3.title": "Lacak makanan",
    "onboarding.steps.s3.body": "Scan barcode, foto, atau cari di database lokal.",
    "onboarding.steps.s4.title": "Aktif & istirahat",
    "onboarding.steps.s4.body": "Latihan, puasa, tidur, dan air dipantau otomatis.",
    "onboarding.steps.s5.title": "Siap memulai!",
    "onboarding.steps.s5.body": "Buka dashboard untuk lihat ringkasan harian.",
    "coach.meals.placeholder": "Tanya coach…",
    "coach.meals.ariaSend": "Kirim",
    "coach.meals.emptyHint":
      'Tanya apa saja tentang pola makanmu 7 hari terakhir. Contoh: "Apakah protein cukup?"',
    "offlineQueue.retryAria": "Coba lagi",
    "offlineQueue.deleteAria": "Hapus",
    "group.inviteToggleOpen": "Bareng grup",
    "group.inviteToggleClose": "Tutup",
    "group.inviteLoading": "Memuat…",
    "group.inviteEmpty": "Belum ada grup. Buat di halaman Groups.",
    "recipes.remixSubstitutionLabel": "Substitusi / Permintaan",
    "recipes.remixSubstitutionPlaceholder": "Ganti daging dengan tempe; rendah garam...",
    "onboarding.health.hint": "Semua jawaban bisa diubah kapan saja di Profil.",
    "fasting.confirmLongTitle": "Puasa lebih dari 16 jam",
    "fasting.confirmLongDesc":
      "Puasa panjang tidak disarankan untuk ibu hamil/menyusui, remaja, atau yang punya riwayat gangguan makan, diabetes, atau kondisi medis lain. Pastikan kamu cukup hidrasi & berhenti kapan saja jika tidak nyaman.",
    "fasting.confirmLongConfirm": "Saya mengerti, mulai",
    "landing.ctaStart": "Mulai",
    "coach.featDisabled": "AI Coach sedang nonaktif",
    "coach.featDisabledDesc": "Admin lagi maintenance coach. Bisa pakai pattern tracker dulu ya.",
    "scanLabel.featDisabled": "Scan label nutrisi sedang nonaktif",
    "scanLabel.featDisabledDesc": "Admin lagi maintenance. Bisa input manual di food diary dulu.",
    "scanPhoto.featDisabled": "Scan foto makanan sedang nonaktif",
    "scanPhoto.featDisabledDesc": "Admin lagi maintenance. Bisa input manual dulu.",
    "fasting.featDisabled": "Tracker puasa sedang nonaktif",
    "fasting.featDisabledDesc": "Admin lagi maintenance. Bisa pakai meal log dulu ya.",

    // ── Mood tracker (C2) ───────────────────────────────────────────
    "mood.howFeel": "Bagaimana perasaanmu?",
    "mood.notePlaceholder": "Catatan singkat (opsional)…",
    "mood.trend14": "Tren 14 hari",
    "mood.avgShort": "Avg",

    // ── Vitals tracker (C2) ──────────────────────────────────────────
    "vitals.bp": "Tekanan",
    "vitals.hr": "Detak",
    "vitals.glucose": "Gula",
    "vitals.recordTitle": "Catat pengukuran",
    "vitals.sysLabel": "Sistolik",
    "vitals.diaLabel": "Diastolik",
    "vitals.hrLabel": "Detak jantung",
    "vitals.gluLabel": "Gula darah",
    "vitals.stateFasting": "Puasa",
    "vitals.statePostMeal": "Setelah makan",
    "vitals.stateRandom": "Acak",
    "vitals.notePlaceholder": "Catatan (opsional)",
    "vitals.historyTitle": "Riwayat",
    "vitals.emptyHistory": "Belum ada catatan",
    "vitals.editClose": "Tutup edit",

    // ── Reminders (C2) ───────────────────────────────────────────────
    "reminder.active": "Pengingat aktif",
    "reminder.next": "Berikutnya",
    "reminder.noneToday": "Tidak ada pengingat tersisa hari ini",
    "reminder.namePlaceholder": "Nama pengingat",
    "reminder.catWater": "Air",
    "reminder.catMeal": "Makan",
    "reminder.catWorkout": "Olahraga",
    "reminder.catSleep": "Tidur",
    "reminder.catMedication": "Obat",
    "reminder.catFasting": "Puasa",
    "reminder.catPrayer": "Sholat",
    "reminder.catCustom": "Lain",
    "reminder.toggle": "Toggle",
    "reminder.everyDay": "Setiap hari",
    "reminder.nDays": "{n} hari",

    // ── Scan item card (C2) ──────────────────────────────────────────
    "scan.editClose": "Tutup edit",
    "scan.logAria": "Catat",
    "scan.confLowHint": "Mirip",
    "scan.inDatabase": "ada di database",
    "scan.portionLabel": "Porsi (g)",
    "scan.caloriesLabel": "Kalori",
    "scan.proteinLabel": "Protein (g)",
    "scan.carbsLabel": "Karbo (g)",
    "scan.fatLabel": "Lemak (g)",
    "scan.auditNote": "Koreksimu akan dikirim ke audit AI untuk perbaikan ke depan.",

    // ── Food detail sheet (C2) ──────────────────────────────────────
    "food.detailLoading": "Memuat...",
    "food.gi": "Indeks Glikemik",
    "food.gl": "GL",
    "food.giLow": "Rendah",
    "food.giMed": "Sedang",
    "food.giHigh": "Tinggi",
    "food.giLegend": "GI < 55 rendah, 55-69 sedang, ≥ 70 tinggi. GL ≥ 20 tinggi.",
    "food.perServing": "per porsi",
    "food.otherNutrients": "Nutrisi Lain",
    "food.fiber": "Serat",
    "food.sugar": "Gula",
    "food.satFat": "Lemak jenuh",
    "food.transFat": "Lemak trans",
    "food.sodium": "Natrium",
    "food.cholesterol": "Kolesterol",
    "food.vitaminsMinerals": "Vitamin & Mineral",
    "food.potassium": "Kalium",
    "food.calcium": "Kalsium",
    "food.iron": "Zat besi",
    "food.vitA": "Vit A",
    "food.vitC": "Vit C",
    "food.vitD": "Vit D",
    "food.servingSizes": "Ukuran Porsi",
    "food.defaultServing": "Default:",
    "food.mainIngredients": "Bahan Utama",
    "food.brand": "Merek",
    "food.healthScore": "Health Score",
    "food.allergenWarn": "Mengandung Alergen",
    "food.logAsFood": "Catat sebagai makanan",
    "food.filterAll": "Semua",

    // ── Food confirmation modal (C2) ────────────────────────────────
    "food.confirmTitle": "Konfirmasi Makanan",
    "food.confirmEmpty": "AI tidak menemukan makanan",
    "food.confirmEmptyHint":
      'Coba gunakan kata kunci yang lebih spesifik, contoh: "nasi goreng ayam"',
    "food.confirmSource": "AI mengenali dari:",
    "food.confirmWarning":
      "⚠️ Semua nilai gizi adalah perkiraan. Edit jika perlu sebelum menyimpan.",
    "food.totalEstimate": "Total perkiraan",
    "food.confHigh": "Tinggi",
    "food.confMed": "Sedang",
    "food.confLow": "Rendah",
    "food.macroCalories": "Kalori",
    "food.macroProtein": "Protein",
    "food.macroCarbs": "Karbohidrat",
    "food.macroFat": "Lemak",
    "food.macroSugar": "Gula",
    "food.macroSodium": "Sodium",
    "food.matchedDb": "Cocok dengan database:",
    "food.savingN": "Menyimpan...",
    "food.savedN": "{n} makanan dicatat ✓",
    "food.warnSodium": "Sodium tinggi ({n}mg = {pct}% batas harian). Batas harian: 2000mg.",
    "food.warnSugar": "Gula tinggi ({n}g = {pct}% batas harian). Batas harian: 50g.",
    "food.warnFat": "Lemak tinggi ({n}g = {pct}% batas harian). Batas harian: 65g.",
    "food.warnCalories": "Kalori sangat tinggi ({n} kkal dalam satu porsi).",

    // ── Landing chrome (C2) ─────────────────────────────────────────
    "landing.dashboard": "Dashboard",
    "landing.login": "Masuk",
    "landing.features": "Fitur",
    "landing.howItWorks": "Cara kerja",
    "landing.testimonials": "Testimoni",
    "landing.faq": "FAQ",
    "landing.free": "Gratis",
    "landing.freeForever": "/ selamanya",
    "landing.freeFeatures1": "Scan makanan AI",
    "landing.freeFeatures2": "Meal plan personal",
    "landing.freeFeatures3": "Puasa & jadwal sholat",
    "landing.freeFeatures4": "HealthyU AI Coach chatbot",
    "landing.startFree": "Mulai gratis",
    "landing.premiumSoon": "Premium (segera)",
    "landing.premiumPrice": "Rp 29rb",
    "landing.premiumPerMonth": "/ bulan",
    "landing.premiumFeatures1": "Konsultasi nutritionist real",
    "landing.premiumFeatures2": "Resep premium tanpa batas",
    "landing.premiumFeatures3": "Export laporan PDF",
    "landing.premiumFeatures4": "Sinkron Apple/Google Fit",
    "landing.notifyMe": "Notify saya",
    "landing.finalCtaTitle": "Mulai perjalanan sehatmu hari ini",
    "landing.finalCtaDesc":
      "Gratis selamanya. Tanpa kartu kredit. Hasil terlihat dalam 7 hari pertama.",
    "landing.finalCtaFree": "Gratis selamanya",
    "landing.finalCtaDb": "Database makanan Indonesia",
    "landing.finalCtaAi": "AI coach 24/7",
    "landing.stickyPrompt": "Siap memulai? Gratis selamanya.",
    "landing.copyright": "Dirancang khusus untuk Indonesia",
    "landing.privacy": "Privasi",
    "landing.prism": "Prism",
    "landing.premiumBadge": "Premium (segera)",

    "admin.articles.title": "Articles",
    "admin.articles.loading": "Memuat…",
    "admin.articles.count": "{count} artikel",
    "admin.articles.searchPlaceholder": "Cari judul, slug…",
    "admin.articles.empty": "Tidak ada artikel.",
    "admin.articles.published": "Published",
    "admin.articles.draft": "Draft",
    "admin.articles.minutesShort": "{n} min",
    "admin.articles.views": "👁 {n} views",
    "admin.articles.by": "oleh {name}",
    "admin.articles.viewPublic": "Lihat publik",
    "admin.articles.unpublish": "Unpublish",
    "admin.articles.publish": "Publish",
    "admin.audit.title": "Audit Log",
    "admin.audit.subtitle":
      "Privacy events (account deletions) + AI call trace. Disatukan dari {table1} dan {table2}.",
    "admin.audit.allCount": "Semua ({count})",
    "admin.audit.categoryCount": "{category} ({count})",
    "admin.audit.empty": "Belum ada audit event.",
    "admin.audit.fieldWhen": "When",
    "admin.audit.fieldActor": "Actor",
    "admin.audit.fieldTarget": "Target",
    "admin.audit.metadata": "Metadata",
    "admin.audit.close": "Tutup",
    "admin.index.title": "System Overview",
    "admin.index.subtitle": "Ringkasan real-time dari semua tabel utama. Diperbarui setiap menit.",
    "admin.index.lastSync": "Sinkron terakhir: {time}",
    "admin.index.totalUsers": "Total Users",
    "admin.index.totalUsersSub": "+{today} hari ini · +{week} minggu ini",
    "admin.index.admins": "Admins",
    "admin.index.adminsSub": "User dengan role admin",
    "admin.index.recipes": "Recipes",
    "admin.index.recipesSub": "{withImage} punya image · {week} minggu ini",
    "admin.index.articles": "Articles",
    "admin.index.articlesSub": "{draft} draft",
    "admin.index.imageCoverage": "Image coverage",
    "admin.index.imageBackfillHint": "Jalankan {cmd} untuk backfill image per recipe.",
    "admin.index.recipesByCategory": "Recipes by category",
    "admin.index.emptyRecipes": "Belum ada recipe.",
    "admin.index.recentRecipes": "Recent recipes",
    "admin.index.viewAll": "Lihat semua →",
    "admin.index.recentUsers": "Recent users",
    "admin.index.noEmail": "(no email)",
    "admin.index.joinedDate": "bergabung {date}",
    "admin.index.never": "never",
    "admin.index.quickActions": "Quick actions",
    "admin.index.qaGenerateRecipesTitle": "Generate recipes",
    "admin.index.qaGenerateRecipesDesc": "Bulk seed via AI",
    "admin.index.qaAuditLogTitle": "Audit log",
    "admin.index.qaAuditLogDesc": "Privacy events",
    "admin.index.qaSystemHealthTitle": "System health",
    "admin.index.qaSystemHealthDesc": "Cron + backups",
    "admin.index.loadFail": "Gagal memuat overview",
    "admin.index.tryAgain": "Coba lagi",
    "admin.index.coverageOf": "{covered} dari {total} resep punya image",
    "admin.index.coverageMissing": "{missing} missing",
    "admin.recipes.title": "Recipes",
    "admin.recipes.loading": "Memuat…",
    "admin.recipes.totalCount": "{total} resep total",
    "admin.recipes.searchPlaceholder": "Cari judul, slug, deskripsi…",
    "admin.recipes.allCategories": "Semua kategori",
    "admin.recipes.catBreakfast": "Breakfast",
    "admin.recipes.catSnack": "Snack",
    "admin.recipes.catMain": "Main",
    "admin.recipes.catSup": "Sup",
    "admin.recipes.catSayur": "Sayur",
    "admin.recipes.catLauk": "Lauk",
    "admin.recipes.catMinuman": "Minuman",
    "admin.recipes.catSalad": "Salad",
    "admin.recipes.colRecipe": "Resep",
    "admin.recipes.colCategory": "Kategori",
    "admin.recipes.colNutrition": "Nutrisi",
    "admin.recipes.colStatus": "Status",
    "admin.recipes.colAction": "Aksi",
    "admin.recipes.published": "Published",
    "admin.recipes.draft": "Draft",
    "admin.recipes.empty": "Tidak ada resep ditemukan.",
    "admin.recipes.viewPublic": "Lihat publik",
    "admin.recipes.unpublish": "Unpublish",
    "admin.recipes.publish": "Publish",
    "admin.recipes.delete": "Hapus",
    "admin.recipes.pagination": "Halaman {page} dari {total}",
    "admin.recipes.nutrition": "{kcal} kcal · {min} min",
    "admin.recipes.deleteTitle": "Hapus resep?",
    "admin.recipes.deleteSlug": "slug: /{slug}",
    "admin.recipes.deleteWarning":
      "Tindakan ini menghapus dari tabel recipes dan seo_recipes. Tidak bisa dibatalkan.",
    "admin.recipes.cancel": "Batal",
    "admin.seed.title": "Seed Recipes (Admin)",
    "admin.seed.generatorTitle": "Bulk Recipe Generator",
    "admin.seed.generatorDesc":
      "Generate Indonesian healthy recipes via VexoAPI and insert into recipes + seo_recipes tables. Idempotent: skips recipes whose slug already exists.",
    "admin.seed.countLabel": "Count (1-20)",
    "admin.seed.categoryLabel": "Category (optional)",
    "admin.seed.categoryPlaceholder": "snack / breakfast / main",
    "admin.seed.focusLabel": "Nutritional focus (optional)",
    "admin.seed.focusPlaceholder": "high protein / low carb / vegan",
    "admin.seed.dryRunLabel": "Dry run (preview only, no DB writes)",
    "admin.seed.generating": "Generating…",
    "admin.seed.previewBtn": "Preview",
    "admin.seed.generateInsertBtn": "Generate & Insert",
    "admin.seed.wouldInsert": "Would insert",
    "admin.seed.inserted": "Inserted",
    "admin.seed.skipped": "Skipped",
    "admin.seed.failed": "Failed",
    "admin.seed.errorTitle": "Error",
    "admin.system.title": "System Health",
    "admin.system.subtitle": "Status real-time infrastructure & services.",
    "admin.system.lastSync": "Sinkron terakhir: {time}",
    "admin.system.refresh": "Refresh",
    "admin.system.application": "Application",
    "admin.system.kvName": "Name",
    "admin.system.kvUrl": "URL",
    "admin.system.kvEnvironment": "Environment",
    "admin.system.supabase": "Supabase",
    "admin.system.kvProject": "Project",
    "admin.system.kvRegion": "Region",
    "admin.system.kvTables": "Tables",
    "admin.system.tablesSummary": "{count} tables · {rows} rows",
    "admin.system.aiUsage": "AI Usage (VexoAPI)",
    "admin.system.last24h": "24h",
    "admin.system.last7d": "7d",
    "admin.system.topFeatures": "Top features (7d)",
    "admin.system.cronJobs": "Cron Jobs",
    "admin.system.backups": "Backups",
    "admin.system.kvLastBackup": "Last backup",
    "admin.system.kvRetention": "{days} hari",
    "admin.system.kvLocalPath": "Local path",
    "admin.system.backupHint": "Backup via {script} (pg_dump). Untuk verify: {verifyCmd}",
    "admin.system.never": "never",
    // Sprint 58-D — promo + banners (ID)
    "admin.promo.title": "Kode Promo",
    "admin.promo.subtitle": "Kelola kode promo: buat, edit, dan aktifkan. Reward coins/XP/premium.",
    "admin.promo.createBtn": "Buat Kode",
    "admin.promo.code": "Kode",
    "admin.promo.label": "Label",
    "admin.promo.description": "Deskripsi",
    "admin.promo.rewardType": "Tipe Reward",
    "admin.promo.rewardValue": "Nilai Reward",
    "admin.promo.maxUses": "Maks Penggunaan",
    "admin.promo.usesRemaining": "Sisa",
    "admin.promo.expiresAt": "Kedaluwarsa",
    "admin.promo.active": "Aktif",
    "admin.promo.empty": "Belum ada kode promo.",
    "admin.promo.savedOk": "Kode promo tersimpan.",
    "admin.promo.deletedOk": "Kode promo dihapus.",
    "admin.promo.duplicate": "Duplikat",
    "admin.promo.duplicatedOk": "Kode promo diduplikasi.",
    "admin.banners.title": "Banner",
    "admin.banners.subtitle": "Kelola banner pengumuman yang tampil di seluruh app.",
    "admin.banners.createBtn": "Buat Banner",
    "admin.banners.placement": "Posisi",
    "admin.banners.title_field": "Judul",
    "admin.banners.description": "Deskripsi",
    "admin.banners.ctaLabel": "Label CTA",
    "admin.banners.ctaHref": "URL CTA",
    "admin.banners.color": "Warna",
    "admin.banners.startsAt": "Mulai",
    "admin.banners.endsAt": "Selesai",
    "admin.banners.active": "Aktif",
    "admin.banners.empty": "Belum ada banner.",
    "admin.banners.savedOk": "Banner tersimpan.",
    "admin.banners.deletedOk": "Banner dihapus.",
    // Sprint 58-E — experiments (ID)
    "admin.exp.title": "Eksperimen A/B",
    "admin.exp.subtitle": "Kelola eksperimen A/B test untuk landing, CTA, dan UI lainnya.",
    "admin.exp.createBtn": "Buat Eksperimen",
    "admin.exp.key": "Key",
    "admin.exp.label": "Label",
    "admin.exp.description": "Deskripsi",
    "admin.exp.variantA": "Variant A (JSON)",
    "admin.exp.variantB": "Variant B (JSON)",
    "admin.exp.splitPct": "Split %",
    "admin.exp.active": "Aktif",
    "admin.exp.empty": "Belum ada eksperimen.",
    "admin.exp.savedOk": "Eksperimen tersimpan.",
    "admin.exp.deletedOk": "Eksperimen dihapus.",
    "admin.exp.invalidJson": "Format JSON tidak valid untuk variant_a_json atau variant_b_json.",
    // Sprint 58-C — promo stats card + quick actions (ID)
    "admin.index.promoStatsTitle": "Promo & Redemptions",
    "admin.index.promoTotalCodes": "Total kode",
    "admin.index.promoActiveCodes": "Kode aktif",
    "admin.index.promoRedemptions": "Redemptions",
    "admin.index.promoUnique": "Unique redeemers",
    "admin.index.qaPromoTitle": "Kelola Promo",
    "admin.index.qaPromoDesc": "Kode & redemptions promo",
    "admin.index.qaBannersTitle": "Kelola Banner",
    "admin.index.qaBannersDesc": "Banner pengumuman",
    "promo.placeholder": "Masukkan kode promo",
    "promo.redeemBtn": "Tukar",
    "promo.redeemOk": "Kode berhasil ditukar!",
    "promo.redeemFail": "Gagal menukar kode",
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
    "common.refresh": "Refresh",
    "common.saving": "Saving\u2026",
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

    // ── progress ──
    "progress.title": "Progress Photos",
    "progress.subtitle": "Track your changes",
    "progress.photoSaved": "Progress photo saved",
    "progress.uploadFailed": "Upload failed",
    "progress.empty": "No progress photos yet",
    "progress.emptyHint":
      "Your first photo is a starting point — gradual progress, not perfection.",
    "progress.saveFailed": "Save failed",

    // ── achievements ──
    "achievements.title": "Achievements",
    "achievements.level": "Level",
    "achievements.xpToLevel": "{xp} XP to level {next}",
    "achievements.share": "Share achievements",
    "achievements.shareTitle": "My HealthyU Achievements",
    "achievements.imageDownloaded": "Image downloaded",
    "achievements.imageFailed": "Failed to create image",
    "achievements.streakLabel": "Streak",
    "achievements.daysUnit": "days",
    "achievements.longestLabel": "Longest",
    "achievements.badgeCount": "Badges ({unlocked}/{total})",
    "achievements.dayUnit": "days",

    // ── alarms ──
    "alarms.title": "Smart Alarm",
    "alarms.wakeTime": "Wake time",
    "alarms.windowHint": "Window (minutes) — wake during light sleep phase",
    "alarms.saved": "Alarm saved",

    // ── backup ──
    "backup.title": "Backup & Export",
    "backup.downloadAll": "Download all your data",
    "backup.downloadAllDesc":
      "Includes profile, meals, workouts, sleep, vitals, medications, mood, community, and achievements. Your data belongs to you — take it anytime.",
    "backup.auditLogged": "Audit logged",
    "backup.allTables": "All tables",
    "backup.generatingJson": "Generating JSON…",
    "backup.downloadJsonFull": "Download JSON (full)",
    "backup.generatingCsv": "Generating CSV…",
    "backup.downloadCsv": "Download CSV (per table)",
    "backup.fileWarning": "File contains all your personal data. Store it securely.",
    "backup.exportHistory": "Export History",
    "backup.entriesCount": "{count} entries",
    "backup.noHistory": "No export history yet.",
    "backup.tableUnit": "tables",
    "backup.rowUnit": "rows",
    "backup.success": "Backup {format} successful · {tables} tables, {rows} rows",
    "backup.failed": "Failed to create backup",
    "backup.pdpDisclaimer":
      "Your rights (PDP Act No. 27/2022): You have the right to access, correct, delete, and restrict processing of your personal data. All exports are logged for transparency and compliance.",
    "backup.justNow": "just now",
    "backup.minutesAgo": "{n} minutes ago",
    "backup.hoursAgo": "{n} hours ago",
    "backup.daysAgo": "{n} days ago",

    // ── googleCalendar ──
    "googleCalendar.title": "Google Calendar",
    "googleCalendar.syncHint": "Sync your workout & meal schedule to Google Calendar.",
    "googleCalendar.connect": "Connect Google Calendar",
    "googleCalendar.oauthConfig": "Google Calendar OAuth will be configured (needs CLIENT_ID)",

    // ── challenges ──
    "challenges.title": "Challenges",
    "challenges.empty": "No challenges yet",
    "challenges.emptyDesc": "New challenges will be released periodically.",
    "challenges.alreadyJoined": "Already joined",
    "challenges.joined": "Joined challenge!",
    "challenges.alreadyJoinedAnnounce": "Already joined challenge {title}",
    "challenges.joinedAnnounce": "Joined challenge {title}",
    "challenges.dayLogged": "Day {day} logged · streak {streak}",
    "challenges.left": "Leave challenge",
    "challenges.continueChallenge": "Continue challenge",
    "challenges.dayLabel": "Day {day}",

    // ── community ──
    "community.postUnit": "post",
    "community.categoryAll": "All",

    // ── onboarding ──
    "onboarding.saveFailed": "Save failed",

    // ── referrals ──
    "referrals.title": "Invite Friends",
    "referrals.yourCode": "Your Code",
    "referrals.shareHint":
      "Share this code. Each friend who joins gets you 100 coins, they get 50 coins.",
    "referrals.copy": "Copy",
    "referrals.shareButton": "Share",
    "referrals.invited": "Invited",
    "referrals.completed": "Completed",
    "referrals.coins": "Coins",
    "referrals.hasCode": "Have a code from a friend?",
    "referrals.singleUse": "Enter once, get 50 bonus coins.",
    "referrals.apply": "Apply",
    "referrals.appliedSuccess": "Success! +{earned} coins",
    "referrals.codeCopied": "Code copied",
    "referrals.linkCopied": "Link copied",
    "referrals.codePlaceholder": "FRIEND CODE",
    "referrals.shareMessage": "Join HealthyU! Use code {code} and get 50 bonus coins 🎁 {url}",

    // ── reminders ──
    "reminders.soon": "soon",
    "reminders.countdownHm": "{h}h {m}m left",
    "reminders.countdownM": "{m}m left",

    // ── subscription ──
    "subscription.title": "Subscription",
    "subscription.currently": "Currently:",
    "subscription.active": "Active",
    "subscription.select": "Select",
    "subscription.upgraded": "Upgraded successfully",

    // ── notifications ──
    "notifications.title": "Notifications",
    "notifications.subtitle": "Recent activity for you",

    // ── mealplan ──
    "mealplan.title": "Meal Plan",
    "mealplan.subtitle": "Plan your weekly menu",
    "mealplan.weekView": "Weekly View",
    "mealplan.weekViewDesc": "View 7 days + adherence + meal swaps",
    "mealplan.dayView": "Daily View",
    "mealplan.generateAI": "Generate AI",
    "mealplan.budgetTitle": "Meal Plan Budget",
    "mealplan.budgetLabel": "Total budget (Rp)",
    "mealplan.budgetDays": "How many days",
    "mealplan.aiGenerating": "AI generating…",
    "mealplan.generatePlan": "Generate Plan",
    "mealplan.dayLabel": "Day {day}",
    "mealplan.groceryTitle": "Grocery List",
    "mealplan.groceryCount": "{count} items",
    "mealplan.planAdded": "Plan added",
    "mealplan.weeklyTitle": "Weekly Meal Plan",
    "mealplan.weeklySubtitle": "Manage & track 7-day plan adherence",

    // ── meals ──
    "meals.detailTitle": "Menu Details",
    "meals.ingredientsLabel": "Ingredients ({servings}x)",
    "meals.cookingSteps": "Cooking Steps",
    "meals.alternatives": "Alternatives",
    "meals.addToDiary": "Add to Diary",
    "meals.addedToDiary": "Added {servings} servings to diary",
    "meals.linkCopied": "Link copied",
    "meals.parseError": "Failed to parse food",
    "meals.voiceParseError": "Failed to parse voice",
    "meals.syncPending": "Sync {pending}",

    // ── recommendations ──
    "recommendations.title": "AI Recommendations",
    "recommendations.subtitle": "Personal meal plans based on your profile & remaining calories",
    "recommendations.notesLabel": "Special notes (optional)",
    "recommendations.notesPlaceholder": "e.g. high protein, quick to cook...",
    "recommendations.generating": "Generating recommendations...",
    "recommendations.generateButton": "Generate Recommendations",
    "recommendations.aiBadge": "AI Personal",
    "recommendations.templateBadge": "📋 Template (estimate)",
    "recommendations.budgetRemaining": "Budget remaining:",
    "recommendations.totalPlan": "Plan total:",
    "recommendations.aiUnavailable": "AI unavailable. Force retry?",
    "recommendations.forceAiRetry": "Try AI again",
    "recommendations.saveToMealPlan": "Save to Today's Meal Plan",
    "recommendations.saved": "Recommendations saved to today's meal plan",
    "recommendations.saveError": "Save failed",
    "recommendations.noRecommendation": "No recommendations yet",
    "recommendations.aiNotAvailable": "AI still unavailable. Try again later.",

    // ── reverseCalorie ──
    "reverseCalorie.title": "Find Menu by Calories",
    "reverseCalorie.targetLabel": "Calorie target",
    "reverseCalorie.searchButton": "Search",

    // ── shopping ──
    "shopping.smartTitle": "Smart Shopping List",
    "shopping.smartPlaceholder": "Paste your meal plan...",
    "shopping.smartGenerating": "Generating...",
    "shopping.smartGenerate": "Generate",
    "shopping.deriveTitle": "Shop from Meal Plan",
    "shopping.deriveSubtitle": "Auto-derive weekly",
    "shopping.deriveFromPlan": "Derived from 7-day meal plan",
    "shopping.deriveProgress": "{done}/{total} items checked",
    "shopping.deriveManual": "Manual",
    "shopping.deriveDownloaded": "Shopping list downloaded",
    "shopping.deriveSaveShare": "Save / Share",
    "shopping.listTitle": "Smart Shopping List",
    "shopping.listPlaceholder": "1 item per line...",
    "shopping.listEstimatePrice": "Price Estimate",

    // ── restaurants ──
    "restaurants.nearbyTitle": "Nearby Restaurants",
    "restaurants.searchNearby": "Search near me",
    "restaurants.pressToSearch": "Press the button to search",

    // ── foods ──
    "foods.filterCount": "{count} filters",
    "foods.filterLabel": "filter",

    // ── pet ──
    "pet.title": "Virtual Pet",
    "pet.adoptTitle": "Adopt your pet",
    "pet.adoptDesc": "Your pet grows with your healthy habits.",
    "pet.namePlaceholder": "Pet name",
    "pet.adoptBtn": "Adopt",
    "pet.adoptedToast": "Pet adopted!",
    "pet.healthLabel": "Health",
    "pet.happinessLabel": "Happiness",
    "pet.energyLabel": "Energy",
    "pet.hungerLabel": "Hunger",
    "pet.feedBtn": "Feed",
    "pet.playBtn": "Play",
    "pet.restBtn": "Rest",
    "pet.levelExp": "Lv {stage} · {exp} EXP",
    "pet.expToNext": "{exp} EXP to Lv {stage}",
    "pet.evolution.title": "Pet Evolution",
    "pet.evolution.stages.egg": "Egg",
    "pet.evolution.stages.hatchling": "Hatchling",
    "pet.evolution.stages.child": "Child",
    "pet.evolution.stages.teen": "Teen",
    "pet.evolution.stages.adult": "Adult",
    "pet.evolution.stageProgress": "Stage {n}/{total} · {xp} XP",
    "pet.evolution.xpNeeded": "{xp} XP needed for {name}",
    "pet.evolution.peakForm": "Peak form reached!",
    "pet.evolution.evolveBtn": "Evolve!",
    "pet.evolution.restartBtn": "Start Over",
    "pet.shop.title": "Pet Accessory Shop",
    "pet.shop.bought": "Bought!",
    "pet.shop.equipped": "Equipped",
    "pet.shop.equip": "Equip",
    "pet.shop.buy": "Buy {cost} coins",
    "pet.svg.title": "Pet Evolution",
    "pet.svg.stageLabel": "Evolution stage",
    "pet.svg.stageProgress": "Stage {n}/{total}",

    // ── gacha ──
    "gacha.title": "Gacha Reward",
    "gacha.spin": "Spin Gacha",
    "gacha.costHint": "Costs 20 coins. Win 0–200 random coins. 2% jackpot!",
    "gacha.spinning": "Spinning...",
    "gacha.pullBtn": "Pull (20 coins)",
    "gacha.result": "🎉 Result: {label}",

    // ── rewards ──
    "rewards.title": "Redeem Coins",
    "rewards.subtitle": "Partner reward marketplace",
    "rewards.outOfStock": "Out of stock",
    "rewards.notEnough": "Not enough",
    "rewards.redeem": "Redeem",
    "rewards.empty": "No rewards yet.",
    "rewards.historyTitle": "Redemption History",
    "rewards.redeemed": "Redeemed! Remaining coins: {coins}",
    "rewards.failed": "Failed",

    // ── currency ──
    "currency.title": "Currency Converter",
    "currency.convertBtn": "Convert",

    // ── loginBonus ──
    "loginBonus.title": "Daily Bonus",
    "loginBonus.desc": "Claim your daily bonus. Longer streak, bigger reward!",
    "loginBonus.claiming": "Claiming…",
    "loginBonus.claimBtn": "Claim Bonus",
    "loginBonus.alreadyClaimed": "Already claimed today ({coins} coins, streak {streak})",
    "loginBonus.claimed": "+{coins} coins! Streak: {streak}",

    // ── streakFreeze ──
    "streakFreeze.title": "Streak Freeze",
    "streakFreeze.desc": "Forgot to log today? Use a freeze to save your streak.",
    "streakFreeze.used": "✓ Freeze Used",
    "streakFreeze.useBtn": "Use 1 Freeze",

    // ── quiz ──
    "quiz.title": "Daily Quiz",
    "quiz.quoteToday": "Quote of the Day",
    "quiz.question": "Question",
    "quiz.correct": "Correct! +{coins} coins",
    "quiz.wrong": "Wrong, try again tomorrow",

    // ── stories ──
    "stories.title": "Meal Stories",
    "stories.placeholder": "Write today’s meal story…",
    "stories.posted": "Story posted",
    "stories.loading": "Loading…",
    "stories.unknownUser": "User",
    "stories.imageAlt": "Story image",
    "stories.empty": "No active stories. Follow friends to see their feed.",

    // ── groups ──
    "groups.title": "Friend Groups",
    "groups.subtitle": "Private leaderboard with friends",
    "groups.createTitle": "Create new group",
    "groups.createPlaceholder": "Group name (e.g. Healthy Family)",
    "groups.createBtn": "Create Group",
    "groups.creating": "Creating...",
    "groups.joinTitle": "Join with code",
    "groups.joinPlaceholder": "Invite code (6 letters)",
    "groups.joinBtn": "Join",
    "groups.joining": "Joining...",
    "groups.myGroups": "My Groups",
    "groups.loading": "Loading...",
    "groups.empty": "No groups yet. Create one or join with a code.",
    "groups.created": "Group created. Code: {code}",
    "groups.joined": "Joined {name}",
    "groups.createFailed": "Failed to create group",
    "groups.joinFailed": "Failed to join",

    // ── leaderboard ──
    "leaderboard.title": "Leaderboard",
    "leaderboard.subtitle": "Top 50 by XP",
    "leaderboard.loading": "Loading...",
    "leaderboard.you": " (You)",
    "leaderboard.level": "Lvl {level}",
    "leaderboard.xp": "XP",
    "leaderboard.empty": "No data yet",

    // ── leaderboardWeekly ──
    "leaderboardWeekly.title": "Weekly Leaderboard",

    // ── discover ──
    "discover.title": "Find Friends",
    "discover.subtitle": "Find people with similar goals",
    "discover.publicCommunity": "Public Community",
    "discover.seeAllPosts": "See all posts from all users",

    // ── heatmap ──
    "heatmap.title": "Yearly Heatmap",
    "heatmap.last365": "Last 365 days",
    "heatmap.mealTooltip": "{date}: {n} meal",

    // ── insights ──
    "insights.title": "AI Insights",
    "insights.badge": "AI Insight · 7 days",
    "insights.refresh": "Refresh",
    "insights.tipsForYou": "Tips for you",
    "insights.sameAsYesterday": "Same as yesterday",
    "insights.share": "Share",
    "insights.notFound": "Not found",
    "insights.copiedMeals": "{n} meals copied from yesterday",
    "insights.noMealsYesterday": "No meals yesterday",
    "insights.clipboardCopied": "Copied to clipboard",
    "insights.shareTitle": "HealthyU Insight",

    // ── charity ──
    "charity.title": "Coin Donation",
    "charity.donateBtn": "Donate {coins} Coins",
    "charity.thanks": "Thank you! {coins} coins donated to {charity}",

    // ── family ──
    "family.title": "Family Plan",
    "family.createTitle": "Create Family Plan",
    "family.namePlaceholder": "Plan name (e.g. Setiawan Family)",
    "family.createBtn": "Create",
    "family.activePlan": "Active plan",
    "family.createdToast": "Family plan created",
    "admin.config.title": "App Config",
    "admin.config.subtitle": "Edit runtime config. Changes apply immediately. Audit-logged.",
    "admin.config.backToAdmin": "Back to Admin",
    "admin.config.empty": "No config keys for this filter.",
    "admin.config.savedOk": "Saved. Cache refreshes in 60 seconds.",
    "admin.config.deletedOk": "Deleted. Code default will be used.",
    "admin.config.value": "Value",
    "admin.i18n.title": "Translation Editor",
    "admin.i18n.subtitle": "Edit copy in-DB without redeploy. Override beats bundled.",
    "admin.i18n.searchPlaceholder": "Search translation key...",
    "admin.i18n.filterAll": "All",
    "admin.i18n.filterOverridden": "Overridden",
    "admin.i18n.filterDefault": "Default",
    "admin.i18n.empty": "No matching keys.",
    "admin.i18n.selectKeyPrompt": "Select a translation key on the left to start editing.",
    "admin.i18n.savedOk": "Saved. Cache refreshes in 5 minutes.",
    "admin.i18n.revertedOk": "Override removed. Back to bundled value.",
    "admin.i18n.overriddenBadge": "Edited",
    "admin.i18n.revert": "Revert",
    "admin.i18n.saveId": "Save (ID)",
    "admin.i18n.saveEn": "Save (EN)",
    "admin.notif.title": "Notification Templates",
    "admin.notif.subtitle":
      "Edit email subject/body and push notification titles without a code deploy. Variables: {name}.",
    "admin.notif.channel": "Channel",
    "admin.notif.channelAll": "All",
    "admin.notif.channelEmail": "Email",
    "admin.notif.channelPush": "Push",
    "admin.notif.localeAll": "All locales",
    "admin.notif.empty": "No templates yet.",
    "admin.notif.searchPlaceholder": "Search template key...",
    "admin.notif.templateKey": "Template Key",
    "admin.notif.subject": "Subject / Title",
    "admin.notif.bodyText": "Body (Text)",
    "admin.notif.bodyHtml": "Body (HTML)",
    "admin.notif.variables": "Variables",
    "admin.notif.variablesHint": "Comma separated. Example: user_name, pattern_count",
    "admin.notif.isActive": "Active",
    "admin.notif.preview": "Preview",
    "admin.notif.previewRendered": "Rendered result",
    "admin.notif.previewSampleVars": "Sample variables (key=value, comma separated)",
    "admin.notif.previewHint":
      "Example: user_name=Andi, pattern_count=12. The {user_name} placeholder will be replaced.",
    "admin.notif.save": "Save",
    "admin.notif.cancel": "Cancel",
    "admin.notif.delete": "Delete",
    "admin.notif.savedOk": "Template saved.",
    "admin.notif.deletedOk": "Template deleted.",
    "admin.notif.disabledBadge": "Disabled",
    "admin.notif.toggleEnable": "Enable",
    "admin.notif.toggleDisable": "Disable",
    "admin.notif.confirmDelete": "Delete this template?",
    "admin.notif.fallbackHint": "Locale 'en' falls back to 'id' when missing.",
    "admin.notif.updatedAt": "Updated",
    "privacyPolicy.section1UserItems.akun":
      "email, display name, profile photo (if uploaded), public preferences.",
    "privacyPolicy.section1UserItems.profil":
      "date of birth, gender, height, weight, allergies, health conditions you log yourself.",
    "privacyPolicy.section1UserItems.log":
      "meals, drinks, exercise, sleep, weight, mood, medications, notes, progress photos.",
    "privacyPolicy.section1UserItems.komunitas":
      "posts, comments, and interactions (likes, saves) you make in the community feature.",
    "privacyPolicy.section1UserItems.ai": "messages you send to the AI coach.",
    "privacyPolicy.section1AutoItems.auth": "session token, refresh token (Supabase Auth).",
    "privacyPolicy.section1AutoItems.notif":
      "push subscription endpoint (VAPID) for sending reminders.",
    "privacyPolicy.section1AutoItems.wearable":
      "Google Fit connection token, if you link a device.",
    "privacyPolicy.section1AutoItems.logs":
      "anonymous error reports, performance metrics (no PII).",
    "privacyPolicy.section2Item.summary": "Display your health summary, charts, and trends.",
    "privacyPolicy.section2Item.recommend":
      "Send personal recommendations (AI coach, workout suggestions, etc.).",
    "privacyPolicy.section2Item.notif":
      "Send notifications you opted into (water reminders, fasting schedule, etc.).",
    "privacyPolicy.section2Item.audit":
      'Audit AI model quality — only if you enable the "Help improve AI" toggle on the privacy page.',
    "privacyPolicy.section2NoTargeted":
      "We do not use your data for targeted ads or share it with advertisers.",
    "privacyPolicy.section4ActiveAccount": "Active account",
    "scan.label.resultsTitle": "Scan results",
    "scan.label.fieldsDetected": "{matched}/{total} fields detected",
    "scan.label.noServingSize": "No serving size",
    "scan.label.energy": "Energy",
    "scan.label.protein": "Protein",
    "scan.label.carbs": "Carbs",
    "scan.label.sugar": "Sugar",
    "scan.label.fatTotal": "Total Fat",
    "scan.label.fatSat": "Saturated Fat",
    "scan.label.fatTrans": "Trans Fat",
    "scan.label.fiber": "Fiber",
    "scan.label.sodium": "Sodium",
    "scan.label.cholesterol": "Cholesterol",
    "scan.label.kcal": "kcal",
    "scan.label.confidenceAccurate": "Accurate",
    "scan.label.confidenceLow": "Low confidence",
    "scan.label.confidenceMedium": "Fair",
    "articles.shareFallback": "HealthyU article",
    "backup.pdpDisclaimerTitle": "Your rights (Indonesian PDP Law No. 27/2022):",
    "backup.pdpDisclaimerBody":
      "You have the right to access, correct, delete, and restrict processing of your personal data. Every export is logged for transparency and compliance.",
    "privacy.openSettings": "Open settings",
    "privacy.toggleAudit": "Toggle audit",
    "privacy.togglePiiRedact": "Toggle PII redaction",
    "privacy.policyLinkTitle": "Privacy Policy",
    "privacyPolicy.title": "Privacy Policy",
    "privacyPolicy.lastUpdated":
      "Last updated: {date} · Compliant with Indonesian PDP Law No. 27/2022",
    "privacyPolicy.summaryTitle": "Quick summary",
    "privacyPolicy.summaryLead":
      "HealthyU is a personal health journaling app. We only collect data you knowingly provide (profile, food log, exercise, sleep, etc.) in order to display it back to you. We **do not sell your data** to third parties.",
    "privacyPolicy.section1Title": "1. Data we collect",
    "privacyPolicy.section1UserTitle": "Data you provide",
    "privacyPolicy.section1AutoTitle": "Data collected automatically",
    "privacyPolicy.section2Title": "2. What data is used for",
    "privacyPolicy.section3Title": "3. Who receives the data",
    "privacyPolicy.section4Title": "4. Retention period",
    "privacyPolicy.section5Title": "5. Your rights (PDP Law articles 5–12)",
    "privacyPolicy.section5Intro": "You have the right to:",
    "privacyPolicy.rightAccessTitle": "View & access",
    "privacyPolicy.rightAccessDesc": "View all personal data we have stored.",
    "privacyPolicy.rightAccessAction": "My privacy",
    "privacyPolicy.rightCopyTitle": "Get a copy",
    "privacyPolicy.rightCopyDesc": "Export all your data as JSON or CSV.",
    "privacyPolicy.rightCopyAction": "Download data",
    "privacyPolicy.rightFixTitle": "Correct",
    "privacyPolicy.rightFixDesc": "Update inaccurate data on the profile page.",
    "privacyPolicy.rightFixAction": "Edit profile",
    "privacyPolicy.rightDeleteTitle": "Delete account",
    "privacyPolicy.rightDeleteDesc": "Permanently delete your account & all data.",
    "privacyPolicy.rightDeleteAction": "Delete account",
    "privacyPolicy.section5After":
      "Every request is processed within **7×24 hours** of verification. Requests affected by legal obligations (e.g. expired audit logs) will be explained.",
    "privacyPolicy.section6Title": "6. Security",
    "privacyPolicy.section7Title": "7. Children under 13",
    "privacyPolicy.section7Body":
      "HealthyU is not intended for children under 13. We do not knowingly collect data from children below that age. Parents/guardians with concerns may contact us to request deletion.",
    "privacyPolicy.section8Title": "8. Contact & complaints",
    "privacyPolicy.section8Intro": "For questions, data access requests, or privacy complaints:",
    "privacyPolicy.section8EmailLabel": "Email:",
    "privacyPolicy.section8After":
      "If you feel a complaint was not handled well, you have the right to file a complaint with the Indonesian personal data protection authority (KOMINFO).",
    "privacyPolicy.section9Title": "9. Changes to this policy",
    "privacyPolicy.section9Body":
      "We will notify you via in-app push notification if material changes are made. Previous versions remain available in the public history of this page.",
    "privacyPolicy.footer":
      "This page is public. For actions (view, download, edit, delete) please log in to the app.",
    "privacyPolicy.publicNotice":
      "This page is public. For actions (view, download, edit, delete) please log in to the app.",
    "backup.historyMeta": "{tables} tables · {rows} rows",
    "body.title": "Body Composition",
    "body.tabs.weight": "Weight",
    "body.tabs.measurements": "Measurements",
    "body.tabs.photo": "Photo",
    "body.tabs.vitals": "Vitals",
    "body.weightChart": "Weight chart",
    "body.weightGoal": "Set target",
    "body.measurements.waist": "Waist",
    "body.measurements.chest": "Chest",
    "body.measurements.arm": "Arm",
    "body.measurements.thigh": "Thigh",
    "body.measurementsHint": "Log weekly to see body composition progress.",
    "body.photo.addProgress": "Add progress photo",
    "body.photo.angles": "Front · Side · Back",
    "body.photo.upload": "Upload photo",
    "body.vitals.bloodPressure": "Blood pressure",
    "body.vitals.heartRate": "Heart rate",
    "body.vitals.bodyTemp": "Body temp",
    "body.vitals.spo2": "SpO₂",
    "body.vitalsLogLink": "Log vitals",
    "patternSettings.title": "Pattern Detection Settings",
    "patternSettings.subtitle": "Tune eating-pattern detection sensitivity to your preferences",
    "patternSettings.skipBreakfastLabel": "Skip Breakfast",
    "patternSettings.daysPerWeek": "{n} days/week",
    "patternSettings.skipBreakfastDesc": "Minimum days per week to count as skipping breakfast",
    "patternSettings.lateNightDinnerLabel": "Late Dinner Hour",
    "patternSettings.lateNightDesc": "Hour that counts as “late dinner”",
    "patternSettings.irregularVarianceLabel": "Irregular Meal Hour Variance",
    "patternSettings.hoursUnit": "±{n} hours",
    "patternSettings.irregularDesc": "Standard deviation tolerance from normal eating pattern",
    "patternSettings.thresholdTitle": "Pattern Threshold",
    "patternSettings.thresholdDesc": "Set the minimum threshold to detect specific patterns",
    "patternSettings.sensitivityTitle": "Detection Sensitivity",
    "patternSettings.sensitivityDesc": "How often patterns are reported",
    "patternSettings.sensitivityLabel": "Sensitivity Level",
    "patternSettings.sensitivity.low": "Low (only strong patterns)",
    "patternSettings.sensitivity.medium": "Medium (default)",
    "patternSettings.sensitivity.high": "High (all patterns detected)",
    "patternSettings.sensitivityHint":
      "Low sensitivity = fewer notifications, only very clear patterns",
    "patternSettings.saveButton": "Save Settings",
    "patternSettings.savingButton": "Saving...",
    "patternSettings.resetButton": "Reset to default",
    "patternSettings.savedAlert": "✅ Pattern settings saved",
    "patternSettings.errorAlert": "❌ Error: {msg}",
    "articles.title": "Health Articles",
    "articles.navTitle": "Article",
    "articles.savedFilter": "★ Saved",
    "articles.empty": "No articles yet",
    "articles.emptyDesc": "New health articles will appear here.",
    "articles.noResults": "No results",
    "articles.noResultsDesc": "Try another category.",
    "articles.byline": "by {name}",
    "articles.unbookmark": "Remove bookmark",
    "articles.bookmark": "Save bookmark",
    "articles.readingTime": "{n} min read",
    "articles.share.trigger": "Share",
    "articles.share.dialogTitle": "HealthyU article",
    "articles.share.dialogText": "Read this health article on HealthyU",
    "articles.linkCopied": "Link copied",
    "articles.loadError": "Article failed to load",
    "articles.loadErrorDesc": "Check your connection and try again.",
    "articles.notFound": "Article not found",
    "articles.notFoundDesc": "This article is no longer available.",
    "articles.contentMissing": "Article content not available yet.",
    "articles.takeaway":
      "Try today: pick one practical idea from this article, apply it at your next meal.",
    "articles.relatedTitle": "Related articles",
    "articles.loadFailImage": "Failed to create image",
    "sleep.diaryTitle": "Sleep Diary",
    "sleep.diaryTonight": "Tonight's sleep",
    "sleep.diaryHours": "hours",
    "sleep.diaryBedtimeLabel": "Bedtime",
    "sleep.diaryWakeLabel": "Wake time",
    "sleep.diaryNotePlaceholder": "Notes (dreams, disturbances, etc.)…",
    "sleep.diaryAvgQuality": "Avg quality",
    "sleep.diaryHistory": "History",
    "scan.fridgeTitle": "Recipes from Fridge",
    "scan.label.title": "Nutrition Label Scan",
    "scan.label.subtitle": "Client-side OCR · no upload",
    "scan.label.takePhoto": "Capture Label Photo",
    "scan.label.gallery": "Choose from Gallery",
    "scan.label.clientScan": "Scan with Client OCR (Offline)",
    "scan.label.aiVision": "AI Vision (More accurate)",
    "scan.label.noOcrBrowser":
      "Browser doesn't support client OCR. Use AI Vision for better results.",
    "scan.label.changePhoto": "Change Photo",
    "scan.label.processing": "Processing…",
    "scan.label.progressStatus": "{pct}%",
    "scan.label.enginePreparing": "Preparing OCR engine…",
    "scan.label.engineInitializing": "Initializing engine…",
    "scan.label.engineReading": "Reading text from image…",
    "scan.label.engineDone": "Done",
    "scan.label.ocrNotSupported": "Browser doesn't support OCR. Use AI fallback.",
    "scan.label.aiVisionPending": "Sending image to AI Vision…",
    "scan.label.offlineSupported":
      "Scan runs 100% on device. Label image is not uploaded unless you choose AI fallback.",
    "scan.label.offlineNoSupport":
      "Browser doesn't support client OCR. Use AI fallback (internet required).",
    "scan.label.tryAi": "Try AI (text parser) for accuracy",
    "scan.label.mealLogTitle": "Save to meal log",
    "scan.label.mealTypes.breakfast": "Breakfast",
    "scan.label.mealTypes.lunch": "Lunch",
    "scan.label.mealTypes.dinner": "Dinner",
    "scan.label.mealTypes.snack": "Snack",
    "scan.label.savedAs.breakfast": "Save as breakfast",
    "scan.label.savedAs.lunch": "Save as lunch",
    "scan.label.savedAs.dinner": "Save as dinner",
    "scan.label.savedAs.snack": "Save as snack",
    "scan.label.servingDefault": "1 serving",
    "scan.label.scanAnother": "Scan another label",
    "scan.label.aiParsing": "AI is parsing OCR text…",
    "scan.label.aiParsingHint": "Sending OCR text (image stays on device). Takes ~3-5 seconds.",
    "scan.label.aiVisionReading": "AI Vision is reading the label…",
    "scan.label.aiVisionHint": "Sending image to Gemini. Takes ~5-10 seconds.",
    "scan.label.aiSuccess": "AI finished reading",
    "scan.label.aiFailed": "AI OCR failed",
    "scan.label.altText": "Nutrition label",
    "scan.label.lowConfidenceHint":
      "Text read (confidence {pct}%). Consider AI fallback for better accuracy.",
    "scan.label.matchedFields": "Success! {matched}/{total} fields detected.",
    "scan.label.ocrFailed": "OCR failed: {msg}. Try AI fallback.",
    "scan.label.saveToMealLogSuccess": "Saved to meal log!",
    "scan.label.saveFailed": "Save failed",
    "scan.label.readFailedFallback": "Failed to read nutrition label",
    "scan.label.detectedFallback": "Label detected",
    "admin.users.banTitle": "Ban user",
    "admin.users.banReason": "Ban reason",
    "admin.users.banReasonPlaceholder": "E.g. spam, abusive language, ToS violation…",
    "admin.users.banConfirm": "Ban {{email}}? They will not be able to log in.",
    "admin.users.unbanConfirm": "Unban {{email}}? They will be able to log in again.",
    "admin.users.forceLogoutConfirm":
      "Force logout {{email}}? Active sessions will be invalidated.",
    "admin.users.banAction": "Ban",
    "admin.users.unbanAction": "Unban",
    "admin.users.forceLogoutAction": "Force logout",
    "admin.users.details": "Details",
    "admin.users.bannedSuccess": "{{email}} banned.",
    "admin.users.unbannedSuccess": "{{email}} unbanned.",
    "admin.users.forceLogoutSuccess": "{{email}} will be force logged out.",
    "admin.users.bannedBy": "Banned {{date}} — {{reason}}",
    "admin.users.neverBanned": "Not banned",
    "admin.users.recentActivity": "Recent activity (audit log)",
    "admin.users.noActivity": "No activity recorded yet.",
    "admin.users.detailTitle": "User details",
    "admin.users.detailClose": "Close",
    "admin.users.roleAdmin": "Admin",
    "admin.users.roleModerator": "Moderator",
    "admin.users.roleUser": "User",
    "admin.users.detailLoadFail": "Failed to load user details.",
    "admin.users.confirmYes": "Yes, proceed",
    "admin.users.confirmNo": "Cancel",
    "admin.users.featFlagsTitle": "Feature flags (live)",
    "admin.users.featFlagsDesc": "Toggled from /admin/config. 60s cache.",
    "admin.users.featFlagEnabled": "ON",
    "admin.users.featFlagDisabled": "OFF",
    "common.featDisabled": "This feature is currently disabled",
    "common.featDisabledDesc":
      "An admin has temporarily turned this feature off. Please try again later.",
    "common.featDisabledBack": "Back to home",
    "common.next": "Next",
    "common.start": "Get started",
    "common.skip": "Skip",
    "common.edit": "Edit",
    "common.send": "Send",
    "common.processing": "Processing…",
    "common.thinking": "Thinking…",
    "common.previous": "Previous",
    "common.dashboard": "Dashboard",
    "common.moods.bad": "Bad",
    "common.moods.low": "Low",
    "common.moods.neutral": "Okay",
    "common.moods.good": "Good",
    "common.moods.great": "Great",
    "onboarding.steps.s1.title": "Welcome",
    "onboarding.steps.s1.body": "Let's start your healthy journey with HealthyU.",
    "onboarding.steps.s2.title": "Set your goals",
    "onboarding.steps.s2.body": "Weight, calories, and daily habits can be adjusted anytime.",
    "onboarding.steps.s3.title": "Track your food",
    "onboarding.steps.s3.body": "Scan barcode, take a photo, or search the local database.",
    "onboarding.steps.s4.title": "Active & rest",
    "onboarding.steps.s4.body": "Workouts, fasting, sleep, and water are tracked automatically.",
    "onboarding.steps.s5.title": "Ready to start!",
    "onboarding.steps.s5.body": "Open the dashboard to see your daily summary.",
    "coach.meals.placeholder": "Ask the coach…",
    "coach.meals.ariaSend": "Send",
    "coach.meals.emptyHint":
      'Ask anything about your last 7 days of eating. Example: "Is my protein enough?"',
    "offlineQueue.retryAria": "Try again",
    "offlineQueue.deleteAria": "Delete",
    "group.inviteToggleOpen": "With group",
    "group.inviteToggleClose": "Close",
    "group.inviteLoading": "Loading…",
    "group.inviteEmpty": "No groups yet. Create one in the Groups page.",
    "recipes.remixSubstitutionLabel": "Substitution / Request",
    "recipes.remixSubstitutionPlaceholder": "Swap beef for tempeh; lower sodium...",
    "onboarding.health.hint": "All answers can be changed anytime in Profile.",
    "fasting.confirmLongTitle": "Fasting longer than 16 hours",
    "fasting.confirmLongDesc":
      "Long fasts are not recommended if you are pregnant/nursing, a teen, or have a history of eating disorders, diabetes, or other medical conditions. Stay hydrated and stop at any time if you feel unwell.",
    "fasting.confirmLongConfirm": "I understand, start",
    "landing.ctaStart": "Get started",
    "coach.featDisabled": "AI Coach is currently disabled",
    "coach.featDisabledDesc": "Coach is under maintenance. Use the pattern tracker for now.",
    "scanLabel.featDisabled": "Nutrition label scan is currently disabled",
    "scanLabel.featDisabledDesc": "Under maintenance. You can log meals manually for now.",
    "scanPhoto.featDisabled": "Photo food scan is currently disabled",
    "scanPhoto.featDisabledDesc": "Under maintenance. You can log meals manually for now.",
    "fasting.featDisabled": "Fasting tracker is currently disabled",
    "fasting.featDisabledDesc": "Under maintenance. Use the meal log for now.",

    // ── Mood tracker (C2) ───────────────────────────────────────────
    "mood.howFeel": "How are you feeling?",
    "mood.notePlaceholder": "Short note (optional)…",
    "mood.trend14": "14-day trend",
    "mood.avgShort": "Avg",

    // ── Vitals tracker (C2) ──────────────────────────────────────────
    "vitals.bp": "BP",
    "vitals.hr": "HR",
    "vitals.glucose": "Glucose",
    "vitals.recordTitle": "Record measurement",
    "vitals.sysLabel": "Systolic",
    "vitals.diaLabel": "Diastolic",
    "vitals.hrLabel": "Heart rate",
    "vitals.gluLabel": "Blood glucose",
    "vitals.stateFasting": "Fasting",
    "vitals.statePostMeal": "Post-meal",
    "vitals.stateRandom": "Random",
    "vitals.notePlaceholder": "Note (optional)",
    "vitals.historyTitle": "History",
    "vitals.emptyHistory": "No records yet",
    "vitals.editClose": "Close edit",

    // ── Reminders (C2) ───────────────────────────────────────────────
    "reminder.active": "Active reminders",
    "reminder.next": "Next",
    "reminder.noneToday": "No reminders left today",
    "reminder.namePlaceholder": "Reminder name",
    "reminder.catWater": "Water",
    "reminder.catMeal": "Meal",
    "reminder.catWorkout": "Workout",
    "reminder.catSleep": "Sleep",
    "reminder.catMedication": "Medication",
    "reminder.catFasting": "Fasting",
    "reminder.catPrayer": "Prayer",
    "reminder.catCustom": "Other",
    "reminder.toggle": "Toggle",
    "reminder.everyDay": "Every day",
    "reminder.nDays": "{n} days",

    // ── Scan item card (C2) ──────────────────────────────────────────
    "scan.editClose": "Close edit",
    "scan.logAria": "Log",
    "scan.confLowHint": "Looks like",
    "scan.inDatabase": "in database",
    "scan.portionLabel": "Portion (g)",
    "scan.caloriesLabel": "Calories",
    "scan.proteinLabel": "Protein (g)",
    "scan.carbsLabel": "Carbs (g)",
    "scan.fatLabel": "Fat (g)",
    "scan.auditNote": "Your correction will be sent to AI audit for future improvements.",

    // ── Food detail sheet (C2) ──────────────────────────────────────
    "food.detailLoading": "Loading...",
    "food.gi": "Glycemic Index",
    "food.gl": "GL",
    "food.giLow": "Low",
    "food.giMed": "Medium",
    "food.giHigh": "High",
    "food.giLegend": "GI < 55 low, 55-69 medium, ≥ 70 high. GL ≥ 20 high.",
    "food.perServing": "per serving",
    "food.otherNutrients": "Other Nutrients",
    "food.fiber": "Fiber",
    "food.sugar": "Sugar",
    "food.satFat": "Saturated fat",
    "food.transFat": "Trans fat",
    "food.sodium": "Sodium",
    "food.cholesterol": "Cholesterol",
    "food.vitaminsMinerals": "Vitamins & Minerals",
    "food.potassium": "Potassium",
    "food.calcium": "Calcium",
    "food.iron": "Iron",
    "food.vitA": "Vit A",
    "food.vitC": "Vit C",
    "food.vitD": "Vit D",
    "food.servingSizes": "Serving Sizes",
    "food.defaultServing": "Default:",
    "food.mainIngredients": "Main Ingredients",
    "food.brand": "Brand",
    "food.healthScore": "Health Score",
    "food.allergenWarn": "Contains Allergens",
    "food.logAsFood": "Log as food",
    "food.filterAll": "All",

    // ── Food confirmation modal (C2) ────────────────────────────────
    "food.confirmTitle": "Confirm Food",
    "food.confirmEmpty": "AI couldn't find any food",
    "food.confirmEmptyHint": 'Try more specific keywords, e.g. "chicken fried rice"',
    "food.confirmSource": "AI recognized from:",
    "food.confirmWarning": "⚠️ All nutrition values are estimates. Edit if needed before saving.",
    "food.totalEstimate": "Total estimate",
    "food.confHigh": "High",
    "food.confMed": "Medium",
    "food.confLow": "Low",
    "food.macroCalories": "Calories",
    "food.macroProtein": "Protein",
    "food.macroCarbs": "Carbs",
    "food.macroFat": "Fat",
    "food.macroSugar": "Sugar",
    "food.macroSodium": "Sodium",
    "food.matchedDb": "Matched in database:",
    "food.savingN": "Saving...",
    "food.savedN": "{n} foods logged ✓",
    "food.warnSodium": "High sodium ({n}mg = {pct}% daily limit). Daily limit: 2000mg.",
    "food.warnSugar": "High sugar ({n}g = {pct}% daily limit). Daily limit: 50g.",
    "food.warnFat": "High fat ({n}g = {pct}% daily limit). Daily limit: 65g.",
    "food.warnCalories": "Very high calories ({n} kcal in one serving).",

    // ── Landing chrome (C2) ─────────────────────────────────────────
    "landing.dashboard": "Dashboard",
    "landing.login": "Login",
    "landing.features": "Features",
    "landing.howItWorks": "How it works",
    "landing.testimonials": "Testimonials",
    "landing.faq": "FAQ",
    "landing.free": "Free",
    "landing.freeForever": "/ forever",
    "landing.freeFeatures1": "AI food scan",
    "landing.freeFeatures2": "Personal meal plan",
    "landing.freeFeatures3": "Fasting & prayer schedule",
    "landing.freeFeatures4": "HealthyU AI Coach chatbot",
    "landing.startFree": "Start free",
    "landing.premiumSoon": "Premium (soon)",
    "landing.premiumPrice": "Rp 299k",
    "landing.premiumPerMonth": "/ month",
    "landing.premiumFeatures1": "Real nutritionist consults",
    "landing.premiumFeatures2": "Unlimited premium recipes",
    "landing.premiumFeatures3": "PDF report export",
    "landing.premiumFeatures4": "Apple/Google Fit sync",
    "landing.notifyMe": "Notify me",
    "landing.finalCtaTitle": "Start your health journey today",
    "landing.finalCtaDesc": "Free forever. No credit card. Results visible in 7 days.",
    "landing.finalCtaFree": "Free forever",
    "landing.finalCtaDb": "Indonesian food database",
    "landing.finalCtaAi": "AI coach 24/7",
    "landing.stickyPrompt": "Ready to start? Free forever.",
    "landing.copyright": "Designed for Indonesia",
    "landing.privacy": "Privacy",
    "landing.prism": "Prism",
    "landing.premiumBadge": "Premium (soon)",

    "admin.articles.title": "Articles",
    "admin.articles.loading": "Loading…",
    "admin.articles.count": "{count} articles",
    "admin.articles.searchPlaceholder": "Search title, slug…",
    "admin.articles.empty": "No articles.",
    "admin.articles.published": "Published",
    "admin.articles.draft": "Draft",
    "admin.articles.minutesShort": "{n} min",
    "admin.articles.views": "👁 {n} views",
    "admin.articles.by": "by {name}",
    "admin.articles.viewPublic": "View public",
    "admin.articles.unpublish": "Unpublish",
    "admin.articles.publish": "Publish",
    "admin.audit.title": "Audit Log",
    "admin.audit.subtitle":
      "Privacy events (account deletions) + AI call trace. Aggregated from {table1} and {table2}.",
    "admin.audit.allCount": "All ({count})",
    "admin.audit.categoryCount": "{category} ({count})",
    "admin.audit.empty": "No audit events yet.",
    "admin.audit.fieldWhen": "When",
    "admin.audit.fieldActor": "Actor",
    "admin.audit.fieldTarget": "Target",
    "admin.audit.metadata": "Metadata",
    "admin.audit.close": "Close",
    "admin.index.title": "System Overview",
    "admin.index.subtitle": "Real-time summary of all key tables. Updated every minute.",
    "admin.index.lastSync": "Last sync: {time}",
    "admin.index.totalUsers": "Total Users",
    "admin.index.totalUsersSub": "+{today} today · +{week} this week",
    "admin.index.admins": "Admins",
    "admin.index.adminsSub": "Users with admin role",
    "admin.index.recipes": "Recipes",
    "admin.index.recipesSub": "{withImage} have image · {week} this week",
    "admin.index.articles": "Articles",
    "admin.index.articlesSub": "{draft} drafts",
    "admin.index.imageCoverage": "Image coverage",
    "admin.index.imageBackfillHint": "Run {cmd} to backfill image per recipe.",
    "admin.index.recipesByCategory": "Recipes by category",
    "admin.index.emptyRecipes": "No recipes yet.",
    "admin.index.recentRecipes": "Recent recipes",
    "admin.index.viewAll": "View all →",
    "admin.index.recentUsers": "Recent users",
    "admin.index.noEmail": "(no email)",
    "admin.index.joinedDate": "joined {date}",
    "admin.index.never": "never",
    "admin.index.quickActions": "Quick actions",
    "admin.index.qaGenerateRecipesTitle": "Generate recipes",
    "admin.index.qaGenerateRecipesDesc": "Bulk seed via AI",
    "admin.index.qaAuditLogTitle": "Audit log",
    "admin.index.qaAuditLogDesc": "Privacy events",
    "admin.index.qaSystemHealthTitle": "System health",
    "admin.index.qaSystemHealthDesc": "Cron + backups",
    "admin.index.loadFail": "Failed to load overview",
    "admin.index.tryAgain": "Try again",
    "admin.index.coverageOf": "{covered} of {total} recipes have image",
    "admin.index.coverageMissing": "{missing} missing",
    "admin.recipes.title": "Recipes",
    "admin.recipes.loading": "Loading…",
    "admin.recipes.totalCount": "{total} recipes total",
    "admin.recipes.searchPlaceholder": "Search title, slug, description…",
    "admin.recipes.allCategories": "All categories",
    "admin.recipes.catBreakfast": "Breakfast",
    "admin.recipes.catSnack": "Snack",
    "admin.recipes.catMain": "Main",
    "admin.recipes.catSup": "Soup",
    "admin.recipes.catSayur": "Vegetables",
    "admin.recipes.catLauk": "Side dish",
    "admin.recipes.catMinuman": "Drinks",
    "admin.recipes.catSalad": "Salad",
    "admin.recipes.colRecipe": "Recipe",
    "admin.recipes.colCategory": "Category",
    "admin.recipes.colNutrition": "Nutrition",
    "admin.recipes.colStatus": "Status",
    "admin.recipes.colAction": "Action",
    "admin.recipes.published": "Published",
    "admin.recipes.draft": "Draft",
    "admin.recipes.empty": "No recipes found.",
    "admin.recipes.viewPublic": "View public",
    "admin.recipes.unpublish": "Unpublish",
    "admin.recipes.publish": "Publish",
    "admin.recipes.delete": "Delete",
    "admin.recipes.pagination": "Page {page} of {total}",
    "admin.recipes.nutrition": "{kcal} kcal · {min} min",
    "admin.recipes.deleteTitle": "Delete recipe?",
    "admin.recipes.deleteSlug": "slug: /{slug}",
    "admin.recipes.deleteWarning":
      "This action deletes from recipes and seo_recipes tables. Cannot be undone.",
    "admin.recipes.cancel": "Cancel",
    "admin.seed.title": "Seed Recipes (Admin)",
    "admin.seed.generatorTitle": "Bulk Recipe Generator",
    "admin.seed.generatorDesc":
      "Generate Indonesian healthy recipes via VexoAPI and insert into recipes + seo_recipes tables. Idempotent: skips recipes whose slug already exists.",
    "admin.seed.countLabel": "Count (1-20)",
    "admin.seed.categoryLabel": "Category (optional)",
    "admin.seed.categoryPlaceholder": "snack / breakfast / main",
    "admin.seed.focusLabel": "Nutritional focus (optional)",
    "admin.seed.focusPlaceholder": "high protein / low carb / vegan",
    "admin.seed.dryRunLabel": "Dry run (preview only, no DB writes)",
    "admin.seed.generating": "Generating…",
    "admin.seed.previewBtn": "Preview",
    "admin.seed.generateInsertBtn": "Generate & Insert",
    "admin.seed.wouldInsert": "Would insert",
    "admin.seed.inserted": "Inserted",
    "admin.seed.skipped": "Skipped",
    "admin.seed.failed": "Failed",
    "admin.seed.errorTitle": "Error",
    "admin.system.title": "System Health",
    "admin.system.subtitle": "Real-time infrastructure & services status.",
    "admin.system.lastSync": "Last sync: {time}",
    "admin.system.refresh": "Refresh",
    "admin.system.application": "Application",
    "admin.system.kvName": "Name",
    "admin.system.kvUrl": "URL",
    "admin.system.kvEnvironment": "Environment",
    "admin.system.supabase": "Supabase",
    "admin.system.kvProject": "Project",
    "admin.system.kvRegion": "Region",
    "admin.system.kvTables": "Tables",
    "admin.system.tablesSummary": "{count} tables · {rows} rows",
    "admin.system.aiUsage": "AI Usage (VexoAPI)",
    "admin.system.last24h": "24h",
    "admin.system.last7d": "7d",
    "admin.system.topFeatures": "Top features (7d)",
    "admin.system.cronJobs": "Cron Jobs",
    "admin.system.backups": "Backups",
    "admin.system.kvLastBackup": "Last backup",
    "admin.system.kvRetention": "{days} days",
    "admin.system.kvLocalPath": "Local path",
    "admin.system.backupHint": "Backup via {script} (pg_dump). To verify: {verifyCmd}",
    "admin.system.never": "never",
    // Sprint 58-D — promo + banners (EN)
    "admin.promo.title": "Promo Codes",
    "admin.promo.subtitle": "Manage promo codes: create, edit, activate. Reward coins/XP/premium.",
    "admin.promo.createBtn": "Create Code",
    "admin.promo.code": "Code",
    "admin.promo.label": "Label",
    "admin.promo.description": "Description",
    "admin.promo.rewardType": "Reward Type",
    "admin.promo.rewardValue": "Reward Value",
    "admin.promo.maxUses": "Max Uses",
    "admin.promo.usesRemaining": "Remaining",
    "admin.promo.expiresAt": "Expires",
    "admin.promo.active": "Active",
    "admin.promo.empty": "No promo codes yet.",
    "admin.promo.savedOk": "Promo code saved.",
    "admin.promo.deletedOk": "Promo code deleted.",
    "admin.promo.duplicate": "Duplicate",
    "admin.promo.duplicatedOk": "Promo code duplicated.",
    "admin.banners.title": "Banners",
    "admin.banners.subtitle": "Manage announcement banners shown across the app.",
    "admin.banners.createBtn": "Create Banner",
    "admin.banners.placement": "Placement",
    "admin.banners.title_field": "Title",
    "admin.banners.description": "Description",
    "admin.banners.ctaLabel": "CTA Label",
    "admin.banners.ctaHref": "CTA URL",
    "admin.banners.color": "Color",
    "admin.banners.startsAt": "Starts",
    "admin.banners.endsAt": "Ends",
    "admin.banners.active": "Active",
    "admin.banners.empty": "No banners yet.",
    "admin.banners.savedOk": "Banner saved.",
    "admin.banners.deletedOk": "Banner deleted.",
    // Sprint 58-E — experiments (EN)
    "admin.exp.title": "A/B Experiments",
    "admin.exp.subtitle": "Manage A/B test experiments for landing, CTA, and other UI.",
    "admin.exp.createBtn": "Create Experiment",
    "admin.exp.key": "Key",
    "admin.exp.label": "Label",
    "admin.exp.description": "Description",
    "admin.exp.variantA": "Variant A (JSON)",
    "admin.exp.variantB": "Variant B (JSON)",
    "admin.exp.splitPct": "Split %",
    "admin.exp.active": "Active",
    "admin.exp.empty": "No experiments yet.",
    "admin.exp.savedOk": "Experiment saved.",
    "admin.exp.deletedOk": "Experiment deleted.",
    "admin.exp.invalidJson": "Invalid JSON for variant_a_json or variant_b_json.",
    // Sprint 58-C — promo stats card + quick actions (EN)
    "admin.index.promoStatsTitle": "Promo & Redemptions",
    "admin.index.promoTotalCodes": "Total codes",
    "admin.index.promoActiveCodes": "Active codes",
    "admin.index.promoRedemptions": "Redemptions",
    "admin.index.promoUnique": "Unique redeemers",
    "admin.index.qaPromoTitle": "Manage Promo",
    "admin.index.qaPromoDesc": "Promo codes & redemptions",
    "admin.index.qaBannersTitle": "Manage Banners",
    "admin.index.qaBannersDesc": "Announcement banners",
    "promo.placeholder": "Enter promo code",
    "promo.redeemBtn": "Redeem",
    "promo.redeemOk": "Code redeemed!",
    "promo.redeemFail": "Failed to redeem code",
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
