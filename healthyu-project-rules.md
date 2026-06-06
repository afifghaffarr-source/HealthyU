# HealthyU Project Rules for Kilo Code

Kamu bekerja pada project HealthyU, aplikasi diet/kesehatan Indonesia berbasis TanStack Start, React, TypeScript, Supabase, PWA, dan Lovable AI Gateway.

## Aturan Wajib

1. Jangan rewrite seluruh project.
2. Jangan menghapus fitur tanpa alasan kuat.
3. Jangan menyentuh file `.env` asli.
4. Jangan hardcode API key, token, secret, service role key, atau cron key.
5. Jangan memakai Supabase publishable key sebagai secret.
6. Jangan memakai `dangerouslySetInnerHTML` untuk konten dari DB, user, atau AI tanpa sanitizer.
7. Jangan membuat AI disebut dokter.
8. Jangan memberi klaim diagnosis medis.
9. Semua perubahan harus kecil, bertahap, dan mudah direview.
10. Semua public hook/cron wajib memakai `CRON_SECRET` atau mekanisme secret yang aman.
11. Semua AI call wajib lewat AI gateway internal.
12. Fitur AI mahal wajib punya rate limit, budget limit, timeout, dan error handling.
13. Social, leaderboard, profile, group, dan challenge wajib menghormati privacy flags user.
14. Data kesehatan user harus diperlakukan sebagai data sensitif.
15. Offline queue, IndexedDB, localStorage, dan cache tidak boleh menyimpan data sensitif tanpa kontrol clear/expiry.
16. Upload gambar wajib validasi MIME, ukuran, dan idealnya resize/strip EXIF.
17. Public pages tidak boleh terkena authenticated dashboard shell.
18. Dashboard tidak boleh dibuat seperti landing page.
19. TasteSkill v2 dipakai untuk polish UI/UX, terutama landing, auth, onboarding, scan result, trust UI, dan public pages.
20. Jangan menambah dependency besar tanpa alasan jelas.
21. Setelah edit, jalankan typecheck/build/test jika tersedia.
22. Jelaskan file yang diubah, alasan, risiko, dan cara test.
23. Jangan lanjut fase berikutnya sebelum user approve.

## Prioritas

1. Security
2. Privacy data kesehatan
3. Build stability
4. Supabase RLS dan auth safety
5. AI cost dan AI safety
6. Bug critical
7. UX clarity
8. Testing
9. Refactor
10. TasteSkill visual polish
11. Product innovation

## Definition of Done

Task selesai jika:

1. Perubahan kecil dan fokus.
2. Tidak ada fitur penting yang dihapus.
3. TypeScript tidak error.
4. Build tidak rusak.
5. Security/privacy tidak memburuk.
6. File yang diubah dijelaskan.
7. Cara test dijelaskan.
