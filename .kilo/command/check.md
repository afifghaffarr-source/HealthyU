---
description: Jalankan typecheck, lint, dan test untuk project HealthyU
---

Jalankan semua pengecekan kesehatan project HealthyU secara berurutan:

1. **Typecheck**: `bunx tsc --noEmit`
2. **Lint**: `bun run lint`
3. **Test**: `bun run test`

Jika ada error, jelaskan:

- File mana yang bermasalah
- Apa penyebab errornya
- Cara memperbaikinya

Jangan otomatis edit file. Tunggu konfirmasi user sebelum memperbaiki.

Jika semua lolos, konfirmasi bahwa project dalam kondisi sehat.
