---
description: Review perubahan kode sebelum commit
---

Review semua perubahan yang belum di-commit di project HealthyU.

## Langkah:

1. Jalankan `git diff` untuk lihat semua perubahan
2. Jalankan `git diff --staged` untuk perubahan yang sudah di-stage
3. Jalankan `git status` untuk file yang belum di-track

## Checklist Review:

Untuk setiap file yang berubah, cek:

- [ ] **Security**: Tidak ada hardcoded API key, token, atau secret
- [ ] **Privacy**: Data kesehatan user di-handle dengan benar
- [ ] **TypeScript**: Tidak ada type error
- [ ] **Pola Kode**: Mengikuti pattern yang sudah ada (createServerFn, \*.server.ts, dll)
- [ ] **XSS**: Tidak ada `dangerouslySetInnerHTML` tanpa sanitizer
- [ ] **AI Safety**: AI call lewat gateway, bukan direct call
- [ ] **Dependency**: Tidak ada penambahan dependency besar tanpa alasan
- [ ] **Test**: Ada test untuk logic baru (jika applicable)

## Output:

Berikan ringkasan:

1. File apa saja yang berubah
2. Apa yang dilakukan perubahan tersebut
3. Potensi risiko
4. Rekomendasi (approve / perlu perbaikan)
