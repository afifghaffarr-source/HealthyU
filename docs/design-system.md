# HealthyU — Design System (Anti-Slop Guardrails)

**Last updated:** 2026-06-18
**Reference skill:** `~/.hermes/skills/creative/design-taste-frontend/SKILL.md` (loaded from upstream `Leonxlnx/taste-skill`)
**Project scope:** Marketing/landing pages, recipe/detail pages, public utilities.
**Out of scope:** Admin panel (`/admin/*`), dashboards, dense data tables, multi-step forms. Admin uses shadcn/ui defaults.

---

## 0. Design Read

**Reading this as:** B2C wellness landing for Indonesian consumers, with a **calm-premium-consumer** language, leaning toward **Forest palette + Geist sans display + restrained motion**.

**Dials:** `VARIANCE 6 · MOTION 4 · DENSITY 4` (wellness-aligned, not flashy).

**Why Forest (not banned beige+brass):** Skill Section 4.2 explicitly bans the AI-default warm-craft palette for premium-consumer briefs. Forest (deep green + bone + amber accent) is one of skill's recommended alternatives. Our brand color is `#6B8E5A` (sage) — already in the Forest family.

---

## 1. Locked Decisions (don't change without approval)

### 1.1 Typography

- **Display + Body:** `Geist Variable` (self-hosted at `/fonts/geist-latin-wght-normal.woff2`, 28K)
- **Mono:** `Geist Mono Variable` (self-hosted at `/fonts/geist-mono-latin-wght-normal.woff2`, 31K)
- **Loader:** `@font-face` in `src/styles.css` (NOT Google Fonts `<link>` in production — skill §3.A)
- **CSS variables:** `--font-sans`, `--font-display`, `--font-mono` (all Geist family)
- **Banned:** Inter as default body font (skill §4.1 anti-slop), Plus Jakarta Sans, JetBrains Mono

### 1.2 Palette

- **Primary:** `--health-green-500: oklch(0.69 0.18 145)` (warm sage `#6B8E5A`)
- **Primary dark (text-safe):** `--health-green-700: oklch(0.45 0.15 145)` (LIGHTHOUSE-002 fixed for WCAG AA)
- **Secondary:** `--health-orange-500: oklch(0.76 0.17 60)` (warm coral)
- **Accent:** `--health-blue-500: oklch(0.66 0.17 248)` (cool blue)
- **Background:** `--sand: oklch(0.97 0.005 240)` (off-white, NOT pure white)
- **Foreground:** `--charcoal: oklch(0.18 0.02 270)` (off-black, NOT pure black)
- **Banned:** Pure `#000000` / `#ffffff` (skill §9.A), beige+brass+oxblood+espresso combo (skill §4.2)

### 1.3 Shape & Radius

- **Base radius:** `--radius: 0.75rem` (12px)
- **Scale:** 12 / 16 / 20 / 24 / 28 (1 unit steps from base)
- **One system per project:** No mixing sharp + pill + soft in same component tree (skill §4.4)

### 1.4 Theme

- Single light theme + `prefers-color-scheme: dark` variant via `data-theme`
- Defined in `src/styles.css` (CSS variables)
- No section-level theme flips (skill §4.11)

---

## 2. Mechanical Checks (run before every PR touching public pages)

| Check                                                | Tool                                         | Limit                            | Last status (2026-06-18)                                |
| ---------------------------------------------------- | -------------------------------------------- | -------------------------------- | ------------------------------------------------------- |
| **Em-dashes in visible text**                        | `grep -P "[—–]" src/...`                     | 0                                | 0/0 ✅                                                  |
| **Scroll cues** (`Scroll`, `↓`, `Scroll to explore`) | grep on rendered text only                   | 0                                | 0/0 ✅                                                  |
| **Marquees** (horizontal scrolling strips)           | `grep "animate-marquee\|@keyframes marquee"` | 1/page                           | 1/1 ✅ (TrustMarquee only)                              |
| **Real section eyebrows** (uppercase label above h2) | grep + manual verify                         | ceil(sections/3)                 | 1/6 ✅                                                  |
| **3-equal-feature-cards rows**                       | grep `grid-cols-3`                           | 0 (asymmetric only)              | 3 uses, all content-justified (testimonials/steps/demo) |
| **Fake product screenshots** (div-based UI mockups)  | manual review                                | 0 (use real screenshots or skip) | HeroDemoCard is real-component preview (skill allows)   |

### 2.1 Em-dash replacement rules

- `X — Y` in body copy → `X, Y` (comma)
- `X — Y` as table placeholder → use `<Minus />` icon from lucide-react
- `Title — SiteName` in page titles/og/twitter → `Title · SiteName` (middle dot, max 1 per line)

### 2.2 Eyebrow rules

- A "section eyebrow" = small uppercase wide-tracking label sitting ABOVE a section headline
- Skill §4.7 hard rule: max 1 per 3 sections, hero counts as 1
- Pills/badges (`inline-flex ... rounded-full`) inside buttons, cards, hero — NOT counted
- Recipe category metadata (`{r.category}`) — NOT counted

---

## 3. Hero Pattern Lock

**Pattern:** Asymmetric Split Hero (text left, asset right) — `grid md:grid-cols-2 gap-10 items-center`

**Hard rules (skill §4.7):**

- Headline max 2 lines on desktop
- Subtext max 20 words AND max 3-4 lines
- CTAs visible without scroll
- Hero font scale: `text-4xl md:text-5xl lg:text-6xl` (default), `text-6xl md:text-7xl` only when headline is 3-5 words
- No version labels (V0.6, BETA) in hero
- No "Brand · No. 01" micro-meta in hero
- Trust micro-strip (4.8★, 1.240+ user) allowed in hero (not a logo wall, not banned)

**Current headline:** "Hidup sehat, AI-nya." (3 words, 1 line at lg:text-6xl)
**Current subtext:** "Scan piring, atur puasa, jadwal sholat. Tanya AI coach kapan saja." (11 words, 2 lines)

---

## 4. Session History

### 2026-06-18 — Initial taste-skill audit + application

**Files changed:** `src/styles.css`, `src/routes/__root.tsx`, `src/features/landing/components/LandingHero.tsx`, `src/features/landing/components/LandingSections2.tsx`, `src/features/landing/components/NewsletterSection.tsx`, `src/features/landing/components/landingData.ts`, `src/routes/index.tsx`, `src/routes/resep.index.tsx`, `public/fonts/geist-*.woff2` (new)

**Commits:**

- `76eaf0e4` — fix(design): remove all visible em-dashes
- `7e088669` — feat(design): self-host Geist Variable, recompose LandingHero
- `9a783df0` — fix(hero): compress headline to 1 line

**Audit results:**

- Em-dashes: 7 → 0 ✅
- Scroll cues: 0 (false-positive earlier from code comments)
- Marquees: 1/1 ✅
- Section eyebrows: 1/6 ✅
- 3-col grids: 3, all content-justified

**Verified in production:** healthyu.web.id hero, font files served, no Google Fonts requests.

---

## 5. Out-of-Scope (don't apply taste-skill here)

Per skill §13, the following surfaces should NOT use these patterns:

- `/admin/*` — uses shadcn/ui defaults, data-density patterns
- `/dashboard`, `/meals`, `/scan`, `/weight` etc. (authenticated product UI)
- Multi-step forms, data tables, settings pages

For these surfaces, use a real design system from skill §2.A (we use shadcn/ui customized with Forest palette).
