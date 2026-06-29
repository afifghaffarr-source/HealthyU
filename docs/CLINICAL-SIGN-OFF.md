# Clinical Sign-Off — Partner Onboarding Plan

**AUDIT-012 Finding 4 resolution.** Sprint 44.

## Background

Safety features user health (ED, mental health) perlu dibedakan:

- **Engineering** safety = OK tanpa clinical sign-off (detection, analytics, resources)
- **Clinical responses** = HARUS sign-off dari psychologist/nutritionist dulu

## Items needing sign-off

| #   | Feature                             | Current state                                                    | Needs review                                                                  |
| --- | ----------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 1   | **chat.safety.ed_disclosure**       | Meta-only telemetry (de-identified, no message text)             | Response wording: "Apa yang harus dikatakan AI saat deteksi ED disclosure?"   |
| 2   | **medicalSafety.CRISIS_RESOURCES**  | Hardcoded phone numbers (reuse verified existing, no unverified) | Verify resources masih valid & up-to-date                                     |
| 3   | **restrictive_cheat_cycle** (S26)   | Meta-pattern detection only — notifies, doesn't counsel          | Threshold calibration: "Kapan warning terlalu agresif?"                       |
| 4   | **weekly digest "Pola Gagal Diet"** | Auto-generated insight from meta-patterns                        | Language review: "Apakah wording-nya bisa trigger shame pada user?"           |
| 5   | **puasa_aman.widget** (Ramadan)     | Widget display + fasting safety tips                             | Content review: "Apakah tips aman puasa sudah sesuai standar gizi Indonesia?" |

## Engagement template

```
Halo Dr/Dietisien [nama],

Kami dari HealthyU — aplikasi diet & kesehatan untuk pengguna Indonesia.
Kami mencari partner psychologist/nutritionist untuk mereview konten
klinis di fitur safety berikut:

1. Deteksi gangguan makan — wording respon AI
2. Threshold pola diet restriktif
3. Konten tips puasa aman
4. Review resource crisis hotline

Keterlibatan: review async, estimasi 2-3 jam per review cycle.
Kompensasi: [negotiable].

Tertarik diskusi? Balas email ini.
```

## Sign-off workflow

1. **Identify partner** — psychologist klinis (untuk ED/safety) + nutritionist (untuk diet/puasa)
2. **Share review items** — kirim dokumen review per item
3. **Async review** — partner review + provide feedback
4. **Apply feedback** — engineering team implement changes
5. **Final sign-off** — partner approve final version
6. **Deploy** — go live dengan audit trail sign-off di commit message
