# TasteSkill Audit & Improvement Plan — HealthyU

Scope: design, UX, copy, safety, and component-system audit only. No DB, auth, dependency, or feature removal. Implementation strictly after approval.

---

## 1. Overall Assessment

HealthyU is a very feature-rich Indonesian AI nutrition app: 130+ routes covering meal logging, AI food scan, fasting (with Ramadhan), prayer, water, mood, sleep, weight, recipes, challenges, groups, gamification, AI coach, weekly AI reports, and PWA/offline. The skeleton is solid: TanStack Start, server functions, RLS, design tokens in `styles.css`, semantic `bg-card`/`text-foreground` usage in audited files, mobile-first `max-w-md` shell, `BottomNav`, `TopAppBar`.

Where it falls short of TasteSkill: surface count outpaces clarity. Dashboard, Scan, Food, Fasting, Onboarding all use the same visual rhythm (stacked rounded cards, identical headers, small primary buttons, tip strips). There is no clear "hero of the page" per screen, motion is mostly absent or generic, AI-estimate safety microcopy is present but inconsistent, and the home shell has 12+ stacked cards competing for attention. The product feels capable but visually generic — close to "template health app" rather than "premium daily companion".

Trust posture: AI scan does let users review/edit before logging (good), but confidence signals, "AI estimate — please review" microcopy, and a global medical disclaimer surface are not consistently present across scan / coach / fasting.

Production readiness: code is well-modularized after recent refactors (files trimmed under ~210 LOC, `tsc` clean per prior batches). Main gaps are design polish, copy consistency, empty/error state coverage, and a few accessibility/perf items.

---

## 2. What Already Works Well

- Architecture: route-per-page, server functions, RLS, offline queue, realtime, PWA — production-grade.
- Design tokens in `src/styles.css`; most components use `bg-card`, `text-foreground`, `text-muted-foreground` instead of raw colors.
- Scan flow already has: pro/flash mode toggle, edit-before-save, meal type picker, photo tip ("sertakan sendok/garpu"), scan-limit guard. Foundation for safety is there.
- Onboarding is already chunked into 5 focused steps with progress bar.
- Indonesian-first microcopy throughout (good for target user).
- Offline-aware Food page with sync chip; well-handled edge case.
- Dashboard has the right ingredients (calorie ring, macros, water, mood, fast clock, streak).
- Reusable primitives exist: `TopAppBar`, `BottomNav`, `Coachmark`, `EmptyState`, `Skeletons`, `StatTile`, `MacroBar`, `CalorieRing`, `HealthCard`.

---

## 3. Biggest Risks (do not regress)

1. Touching schema/RLS/auth — explicitly out of scope.
2. Rewriting the dashboard wholesale — too many query keys + prefetches wired in; redesign must preserve data shape.
3. Removing any of the 130+ routes — even niche ones may be linked from coachmarks, push, or AI report deep links.
4. Replacing `TopAppBar`/`BottomNav` API — used by ~100 files.
5. Heavy animation libs or 3D — violates calm-trust tone and inflates bundle.

---

## 4. Critical Issues (fix first)

C1. **Dashboard is a wall of cards, no hero.** 12+ stacked sections, every card same weight. User cannot answer "what should I do next?" in 1 second. TasteSkill violation: no visual hierarchy, no obvious primary action.

C2. **AI-estimate safety microcopy is inconsistent.** Scan result list does not always show "Estimasi AI — periksa sebelum simpan" near the Save CTA, and confidence per item isn't surfaced visually (only in data). Coach replies lack a persistent footer disclaimer chip.

C3. **No global medical disclaimer surface.** Project Knowledge requires it for pregnancy/ED/diabetes/etc. flows. Not visible on Onboarding, Coach, or Fasting start.

C4. **Fasting start lacks safety friction.** `ProtocolPicker` → `startMut` is one tap; no "are you fasting safely?" check, no hydration reminder copy, no easy guilt-free stop CTA hierarchy.

C5. **Onboarding asks 5 steps but no "why we ask" microcopy** on each field; no "you can change this later" reassurance; no privacy line. Beginner-unfriendly per Project Knowledge rules.

C6. **Scan CTA wording promises certainty.** "AI akan mengenali nama, porsi, dan kalori secara otomatis" — should be "AI memperkirakan… kamu bisa ubah sebelum simpan."

---

## 5. High-Priority Issues

H1. Empty/error states are minimal on Food log, Fasting history, Scan history, Progress — mostly empty list with no illustration, no suggested next action.
H2. Loading skeletons exist (`src/components/healthyu/skeletons.tsx`) but not used in dashboard sub-cards — initial paint shows flickering "0 kal".
H3. Dark mode contrast: `bg-muted/40` tip strips on dark theme become near-invisible on some screens; need audit pass.
H4. Tap targets: ghost icon buttons (history icon in scan, sync pill) are <44×44 on mobile.
H5. Mode toggle in Scan ("Pakai Pro / Flash") is jargon-heavy for beginners. Should be "Akurat lebih lambat / Cepat".
H6. Coach page lacks prompt chips per Project Knowledge ("Protein saya kurang…", "Ide menu warung sehat"…) — need to verify and add.
H7. Onboarding progress bar uses `bg-mint` for inactive — should be `bg-muted` token for theme consistency.
H8. No global "today's next step" smart card on dashboard.
H9. Articles/Education lack "2-minute read" badge + "Apply this today" CTA per Project Knowledge.
H10. Settings/Profile likely flat list without grouped sections + safe destructive action styling (verify).

---

## 6. Medium-Priority Issues

M1. Headings: many pages have `<TopAppBar title=… subtitle=…>` but no semantic `<h1>` — verify TopAppBar renders h1; if not, fix once at primitive level.
M2. `text-[11px]` micro-copy used in several places — below WCAG comfortable read; bump to 12–13.
M3. Inconsistent rounding/spacing: cards use `rounded-2xl`, `rounded-3xl`, `rounded-xl` interchangeably; codify scale.
M4. Motion: zero meaningful microinteractions on log/save/streak — opportunity for subtle reward animation (calm, not noisy).
M5. Dashboard CTAs (`ScanCta`, `AiRecommendationsCta`, `AiChatCta`) are three separate cards stacked — could be one elegant action row.
M6. Toast usage is good but lacks differentiated success styles for "logged meal" vs "achievement unlocked".
M7. `tabular-nums` inconsistently applied to calorie/macro counters → numbers jitter.
M8. Scan "Pindai Ulang" button only appears if items empty — confusing; should always be available as secondary.
M9. Fasting clock not announced to screen readers (`aria-live`).
M10. Coachmark for dashboard exists but no coachmarks elsewhere (Scan, Coach, Fasting).

---

## 7. Nice-to-Have

N1. "Today's Balance" hero card on dashboard combining calories + macro gap + smart next step in one elegant unit.
N2. Smart Next Step engine: rule-based pick from {drink water, log lunch, light walk, break fast soon, log weight}.
N3. Local Food Hint chip in scan ("Mirip nasi goreng? Konfirmasi.").
N4. Confidence badges in scan list (Tinggi/Sedang/Perlu cek) with color + icon.
N5. "Repeat yesterday's breakfast" in Food page.
N6. "Frequent meals" carousel.
N7. Non-scale wins on Progress (streak days, consistency %, water goal hits).
N8. Calm haptic on log save (PWA `navigator.vibrate(8)`).
N9. Onboarding "Goal personality" cards (lebih sehat / lebih bertenaga / berat ideal).
N10. Fasting "Break fast wisely" suggestion card after stop.

---

## 8. Page-by-Page Redesign Plan

### 8.1 Dashboard / Home

Goal: 1-second answer to "what's my day, what do I do next?"

- Replace top stack with: **Greeting (compact) → Today Hero (calorie ring + remaining + smart next step) → Quick Actions row (Scan, Log, Water+1) → Compact stats row (fast, water, mood) → Today's meals → Secondary cards (challenges, gamification, tip) collapsed below the fold.**
- Demote `DailyBonusButton` into the greeting row as a small coin chip.
- Merge `ScanCta` + `AiRecommendationsCta` + `AiChatCta` into one 3-button action row.
- Add `aria-live="polite"` to fast timer.
- Use skeletons in every sub-card during initial load.

### 8.2 Food Scan

Goal: scan fast → review safely → save confidently.

- Add persistent **"Estimasi AI — periksa porsi & kalori sebelum simpan"** banner above result list.
- Confidence badge per item (color-coded; from server data).
- Reword mode toggle: "Cepat / Akurat" with tiny help icon.
- Big primary "Simpan ke log" + small secondary "Pindai ulang" always visible after scan.
- Add empty state when scan finds nothing: friendly illustration + "Coba foto lebih dekat".
- Add a "Mirip [nama]? Konfirmasi" chip when low confidence.

### 8.3 Food Log

- Group meals by `breakfast / lunch / dinner / snack` with section headers.
- Add "Ulangi sarapan kemarin" chip when relevant.
- Add macro-gap insight line above list ("Protein masih -22g hari ini").
- Strong empty state with two CTAs: Scan / Tambah manual.

### 8.4 Onboarding

- Above each field add "Kenapa kami tanya ini?" inline disclosure.
- Bottom of each step: "Bisa diubah kapan saja di Profil." reassurance.
- Replace `bg-mint` progress with `bg-muted` token.
- Step 3 (goal): redesign as 3 "personality" cards with icon + plain language.
- Step 5 (health): add medical disclaimer card + "kalau punya kondisi medis, konsultasikan ke profesional".
- Add comfort-pace selector for "lose" goal (santai 0.25kg/mg, normal 0.5, ambisius 0.75) instead of hard −400.

### 8.5 AI Coach

- Persistent footer chip: "Saran umum, bukan saran medis."
- Above input: 4 prompt chips per Project Knowledge.
- Long replies: collapse with "Tampilkan lebih banyak".
- Detect medical keywords → append "Pertimbangkan konsultasi dengan profesional" (server-side, safe).

### 8.6 Fasting Timer

- Pre-start friction card: 2 quick checks (tidak hamil/menyusui · tidak ada gangguan makan) before allowing extreme protocols (>16h).
- Active card: phase explainer ("0–4h: pencernaan", "4–12h: glikogen", …), hydration nudge every 2h via toast.
- Stop button: large, guilt-free copy "Selesai untuk sekarang".
- After stop: "Break fast bijak" suggestion card.

### 8.7 Progress

- 3 simple charts max: weight trend, calorie consistency, fasting consistency.
- Add Consistency Score (0–100) + Non-scale Wins list.
- Avoid shame language; replace any "deficit/failed" with "rata-rata".

### 8.8 Articles / Education

- Add "2 menit baca" badge + "Coba hari ini" CTA at article foot.
- Short sections with H2 every ~150 words.
- Related articles row at bottom.

### 8.9 Settings / Profile

- Group: Akun · Target & nutrisi · Estimasi AI · Notifikasi · Data & privasi · Tentang.
- Destructive actions (delete account, reset) in dedicated red-tinted card with confirm dialog.
- Add "Disclaimer medis" link surface.

### 8.10 Auth & Disclaimer

- On first sign-in (post-onboarding step 5 or first dashboard visit) show one-time disclaimer modal: "HealthyU bukan pengganti dokter…" with "Saya mengerti" CTA, persisted in profile flag (no schema change — reuse existing `onboarded` or local flag).

---

## 9. Component System Plan

Codify the following primitives (most exist; tighten props/variants):

- `PageShell` (wraps `max-w-md mx-auto px-5 pt-2 pb-28` + optional `TopAppBar`).
- `HeroCard` (single page hero — used on Dashboard/Today, Fasting active, Progress).
- `ActionRow` (2–4 icon+label buttons; replaces stacked CTAs).
- `InsightLine` (single line of italic muted text above a list).
- `ConfidenceBadge` (`high | medium | low`).
- `SafetyChip` ("Estimasi AI", "Bukan saran medis", "Periksa sebelum simpan").
- `EmptyState` (already exists — standardize on illustration + headline + sub + CTA).
- `SectionHeader` (already exists — enforce single H2 per section).
- `StatTile` + `MacroBar` + `CalorieRing` — keep, but pass `tabular-nums` and unified rounding.
- `DisclaimerCard` (medical disclaimer surface, reused on onboarding/coach/fasting).

Spacing/rounding scale: cards `rounded-2xl`, pills `rounded-full`, sheets `rounded-3xl` only at modal top. Spacing rhythm `space-y-5` between sections, `space-y-3` inside cards.

Typography: body 14, hint 12, micro 11 only for legal/footnotes; numbers always `tabular-nums`.

Motion: only on log success (200ms scale 0.98→1), streak increment (number flip), and bottom-sheet open (250ms ease-out). No parallax, no decorative bg motion.

---

## 10. Unexpected but Relevant Ideas (TasteSkill differentiators)

U1. **Today's Balance** hero: single radial showing kcal remaining with macro arcs; replaces 3 separate cards.
U2. **Smart Next Step** chip on dashboard: rule-based, e.g. after 11:30 → "Catat makan siang", after no water in 3h → "Minum air".
U3. **Local Food Hint** in scan: if AI top label matches Indonesian dish list, prepend "Mirip {dish}? Konfirmasi."
U4. **Gentle Recovery** state when over target: card flips to "Kita seimbangkan besok — geser pilihan ke protein & sayur" (no shame).
U5. **Streak Freeze** explainer mini-card the day before a streak break (uses existing streak-freeze widget).
U6. **Confidence-weighted save**: low confidence → Save button becomes "Periksa & simpan" (forces tap into edit screen first).
U7. **Break-fast wisely**: after stopping fast, suggest 3 light foods from local DB.
U8. **2-minute Daily Tip** card on dashboard linking to article.
U9. **Voice quick log** chip ("Tadi makan nasi padang") on Food page using existing parseVoice.
U10. **One-tap "Ulangi kemarin"** for breakfast/lunch.

---

## 11. Safe Implementation Order

Phase 1 — Safety & trust (no visual rewrites; copy + small UI):

- C2 add SafetyChip on Scan result list + Coach footer.
- C3 add DisclaimerCard component, mount on Onboarding step 5 + first-visit Coach.
- C4 fasting safety friction for >16h protocols.
- C6 reword Scan intro copy.
- H5 reword Pro/Flash toggle.

Phase 2 — Dashboard hierarchy redesign:

- C1 introduce HeroCard + ActionRow; collapse secondary cards below fold; demote DailyBonus.
- M5 merge 3 CTAs into ActionRow.
- N1/U1 Today's Balance hero (uses existing data, no schema change).
- U2 Smart Next Step (pure client rule).

Phase 3 — Page polish:

- 8.2 Scan UI polish + confidence badge.
- 8.3 Food log grouping + macro-gap insight.
- 8.4 Onboarding microcopy + reassurance + comfort pace.
- 8.6 Fasting phase explainer + hydration nudge + break-fast suggestion.
- 8.7 Progress consistency score + non-scale wins.

Phase 4 — System tightening:

- Component primitives (PageShell, SafetyChip, ConfidenceBadge, DisclaimerCard).
- Empty/loading/error pass across 8 main pages.
- Dark mode contrast + tap target audit.
- `aria-live` on fast clock + scan loading.

Phase 5 — Nice-to-haves:

- Articles "2 menit baca" + Apply CTA.
- Settings grouped sections.
- Subtle motion on log success.

Each phase ships independently, with no DB/auth/dependency changes.

---

## 12. What to Implement First

Recommended first batch (one PR, ~half-day, zero risk to data/auth):

1. **Safety microcopy pass** — add `SafetyChip` ("Estimasi AI — periksa sebelum simpan") on Scan result list; reword Scan intro and Pro/Flash toggle; add a "Saran umum, bukan saran medis" footer chip on Coach.
2. **DisclaimerCard component + Onboarding step 5 mount** — reusable, no schema, no flow change.
3. **Dashboard quick win** — collapse `ScanCta`+`AiRecommendationsCta`+`AiChatCta` into a single `ActionRow`; promote `HeroStatsRow` visually (larger ring, secondary tiles smaller); demote `DailyBonusButton` into a chip in the greeting row.
4. **Fasting safety friction** for protocols >16h (single confirm dialog reusing `ConfirmDialog`).

Outcome after batch 1: app reads visibly more trustworthy and less generic on the three pages users hit first (Dashboard, Scan, Onboarding), with zero functional regression risk and no schema/auth/dependency touch.

Awaiting approval to switch to build mode and execute Phase 1.
