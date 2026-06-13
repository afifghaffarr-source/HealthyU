# HealthyU — Kilo Code Instructions

## Project Overview

HealthyU adalah aplikasi diet & kesehatan Indonesia.
Stack: **TanStack Start v1 + React 19 + TypeScript + Tailwind v4 + Supabase (self-managed) + PWA**.
Runtime: Cloudflare Pages + Workers. Package manager: **Bun** (bukan npm/yarn/pnpm).
AI: **VexoAPI** (gpt-oss-120b / glm-4.7-flash / multimodal gemini).

## Perintah Penting

| Fungsi     | Command                        |
| ---------- | ------------------------------ |
| Install    | `bun install`                  |
| Dev server | `bun run dev` (localhost:8080) |
| Typecheck  | `bunx tsc --noEmit`            |
| Lint       | `bun run lint`                 |
| Test unit  | `bun run test`                 |
| Build      | `bun run build`                |

**Wajib jalankan `bunx tsc --noEmit` dan `bun run test` setelah edit file `.ts`/`.tsx`.**

## Aturan Wajib (dari healthyu-project-rules.md)

1. Jangan rewrite seluruh project. Perubahan harus kecil & bertahap.
2. Jangan hapus fitur tanpa alasan kuat.
3. Jangan edit `.env` asli. Gunakan `.env.example` sebagai template.
4. Jangan hardcode API key, token, secret, atau service role key.
5. Jangan pakai `dangerouslySetInnerHTML` untuk konten dari DB/user/AI tanpa sanitizer.
6. Semua AI call wajib lewat `src/features/ai/lib/aiGateway.server.ts` (VexoAPI-backed). API key: `VEXO_API_KEY`.
7. Semua cron/hook wajib pakai `CRON_SECRET`.
8. Data kesehatan user = data sensitif. Hormati privacy flags.
9. Jangan tambah dependency besar tanpa alasan jelas.
10. Jelaskan file yang diubah, alasan, risiko, dan cara test.
11. Jangan lanjut ke langkah berikut sebelum user approve.

## Prioritas

1. Security → 2. Privacy → 3. Build stability → 4. Supabase RLS → 5. AI cost/safety → 6. Bug critical → 7. UX → 8. Testing → 9. Refactor → 10. Visual polish

## Pola Kode

- Server function: `createServerFn` dari `@tanstack/react-start`
- File server-only: rename jadi `*.server.ts` (bukan `import "server-only"`)
- Route: file-based di `src/routes/`
- AI: VexoAPI lewat adapter, jangan direct call ke VexoAPI dari feature code
- UI: shadcn/ui + Tailwind v4 + `class-variance-authority`
- State: TanStack Query + React Hook Form + Zod validation
- Auth: Supabase Auth (self-managed project) — `supabase.auth.signInWithOAuth(...)` di client
- Error reporting: `src/lib/errorReporting.ts` (fire-and-forget POST ke `/api/log-error`)
- Deploy: Cloudflare Pages + Workers; env vars di CF dashboard, bukan di repo

## Definition of Done

Task selesai jika:

- Perubahan kecil dan fokus
- Tidak ada fitur yang dihapus
- `bunx tsc --noEmit` tidak error
- `bun run build` berhasil
- `bun run test` lolos
- Security/privacy tidak memburuk
- File yang diubah dijelaskan ke user

## Struktur Folder Penting

```
src/
  features/       # fitur-fitur app (ai, scan, wellness, dll)
  routes/         # file-based routing TanStack Router
  components/     # shared UI components (shadcn/ui)
  lib/            # utility, constants, rate limit, cron auth
supabase/         # migrations, functions
e2e/              # Playwright tests
```
