---
description: Cari dan perbaiki bug secara aman (cari dulu, jelaskan, tunggu konfirmasi)
---

Mode aman untuk memperbaiki bug di project HealthyU.

## Langkah yang wajib diikuti:

### 1. Pahami Masalah

- Minta user menjelaskan gejala bug (halaman mana, apa yang terjadi, apa yang diharapkan)

### 2. Cari Penyebab

- Cari file yang relevan berdasarkan gejala
- Baca kode yang berkaitan
- Identifikasi akar masalah (bukan hanya gejala)

### 3. Jelaskan Rencana

Sebelum mengedit file, jelaskan ke user:

- **File yang akan diubah**: path lengkap
- **Apa yang salah**: penyebab teknis
- **Apa yang akan diubah**: perubahan spesifik
- **Risiko**: apa yang bisa terpengaruh
- **Cara test**: bagaimana user bisa verifikasi fix

### 4. Tunggu Konfirmasi

**JANGAN edit file sebelum user menyetujui rencana.**

### 5. Setelah Edit

- Jalankan `bunx tsc --noEmit`
- Jalankan `bun run test`
- Jelaskan ringkasan perubahan

## Aturan Safety

- Jangan rewrite lebih dari yang diperlukan
- Jangan hapus fitur lain
- Jangan edit `.env`
- Jangan hardcode secret/keys
- Ikuti pola kode yang sudah ada di project
