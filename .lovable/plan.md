# HealthyU Full Redesign — 6 Fase

Spec sangat luas (20 layar + design system penuh + 5 fitur baru). Eksekusi bertahap; setiap fase 1 chat turn agar bisa direview & tidak break preview.

## Phase 1 — Design Tokens & Foundation *(turn ini)*
- Rewrite `src/styles.css`: palet Green/Orange/Blue (oklch konversi #4CAF50/#FF9800/#2196F3), semantic success/warning/error/info, chart colors (protein/carbs/fat/fiber), spacing scale 4/8/12/16/20/24/32/40/48/64, radius scale 8/12/16/24/full, shadow levels 1–4, dark mode variants.
- Tambah Google Fonts via `<link>` di `__root.tsx`: Plus Jakarta Sans 700, Inter 400/500/600, JetBrains Mono 700.
- Update `@theme` dengan `--font-display`, `--font-body`, `--font-mono`.
- Hasil: semua komponen existing otomatis ikut palet baru (sage→green, dst).

## Phase 2 — Komponen Library (atomic)
- `src/components/healthyu/`: Button (primary/secondary/text/FAB/icon), Card variants (standard/food/stat/progress), Input/SearchBar/Chip, Modal/BottomSheet, Badge (achievement/status/calorie), CalorieRing 180px, MacroBar stacked, NutritionPieChart, BottomNav 5-item, TopAppBar, TabBar, ListItem, Divider, Toast.

## Phase 3 — Layar Existing Redesign (Dashboard, Food, Exercise, Fasting, Profile, Reports)
- Apply komponen Phase 2 ke 6 route yang sudah ada sesuai wireframe (health score card, daily progress ring, quick actions row, AI insight card, upcoming, recent activity, dll).

## Phase 4 — Layar Baru
- Routes baru: `/onboarding` (5-step swipeable), `/body` (Berat/Ukuran/Foto/Vitals tabs), `/articles` (hub + reader), `/community` (Feed/Challenges/Groups), `/achievements` (grid + level bar), `/notifications`, `/prayer-times`, `/shopping-list`, `/workout-player`, `/meal-detail`.

## Phase 5 — Fitur Khusus
- **Virtual Pet** (`/pet`): avatar SVG, stats (health/happy/energy/hunger), evolution 1-5, feed/play/exercise/sleep actions, derived dari user health metrics.
- **AI Chatbot** (`/chat`): AI SDK + Lovable AI Gateway `google/gemini-3-flash-preview`, persistent threads di Supabase, AI Elements primitives, tool calling untuk inline nutrition/exercise cards.
- **Prayer Times** (`/prayer-times`): API Aladhan, countdown, daftar 6 waktu, Qibla compass.
- **Shopping List** (`/shopping-list`): derive dari meal plan, kategori protein/sayur/karbo, total Rp, checklist persist.

## Phase 6 — Polish & A11y
- Micro-interactions (button press scale, heart pop, confetti, ring fill glow).
- `prefers-reduced-motion` gate semua animasi.
- WCAG AA contrast audit (semua kombinasi text/bg).
- Tablet/desktop breakpoint (md: 2-col, lg: sidebar nav).
- Empty/error/loading states global.
- Skeleton shimmer.

## Technical Details

### Phase 1 token mapping (oklch konversi)
```
--primary: oklch(0.66 0.17 142)       /* #4CAF50 green-500 */
--primary-dark: oklch(0.55 0.17 142)  /* #388E3C */
--secondary: oklch(0.72 0.17 60)      /* #FF9800 orange */
--accent: oklch(0.62 0.18 250)        /* #2196F3 blue */
--success: oklch(0.71 0.16 142)
--warning: oklch(0.78 0.15 75)
--error: oklch(0.65 0.21 25)
--chart-protein: oklch(0.69 0.18 18)
--chart-carbs: oklch(0.74 0.13 185)
--chart-fat: oklch(0.88 0.13 95)
--chart-fiber: oklch(0.85 0.09 168)
--bg: oklch(0.97 0.005 240)           /* #F5F7FA */
--surface: oklch(1 0 0)
--text-primary: oklch(0.18 0.02 270)  /* #1A1A2E */
--text-secondary: oklch(0.50 0.01 250)/* #6B7280 */
```

### Phase 1 dark mode
- `--bg: oklch(0.15 0 0)` (#121212)
- `--surface: oklch(0.20 0 0)` (#1E1E1E)
- `--text-primary: oklch(1 0 0)`
- `--text-secondary: oklch(0.70 0 0)`

### Phase 1 fonts
```tsx
// __root.tsx head().links
{ rel: "preconnect", href: "https://fonts.googleapis.com" },
{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@700&display=swap" }
```

### Phase 5 secrets (akan diminta saat fase berjalan)
- `LOVABLE_API_KEY` (auto-provisioned untuk AI Chatbot).
- Aladhan API public, no key needed untuk Prayer Times.

## Out of Scope
- Lottie files (perlu `.json` asset upload; bisa dirender placeholder SVG dulu).
- Google Fit / Calendar / Drive integration (butuh OAuth scope user).
- Wearable device sync (butuh native bridge — tidak mungkin di web).
- Bahasa toggle ID/EN sudah ada (Phase 1 tidak ubah, lanjut pakai).
