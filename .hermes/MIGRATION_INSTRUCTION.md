# ⚠️ MIGRATION BELUM DI-APPLY

**Konfirmasi:** `user_feedback` column masih belum ada di database.

---

## 🚨 MUST DO NOW (30 detik):

**1. Buka tab baru:**
https://supabase.com/dashboard/project/ohkfcldkuzfcxnpqvdvc/editor

**2. Klik tombol "New Query"**

**3. Copy SEMUA text ini:**

```sql
CREATE TABLE IF NOT EXISTS public.pattern_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  last_occurrence TIMESTAMPTZ NOT NULL,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  baseline_count INTEGER,
  urgency_score FLOAT NOT NULL,
  ai_explanation TEXT NOT NULL,
  analysis_metadata JSONB,
  quick_actions JSONB,
  user_feedback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pattern_insights_user_id ON public.pattern_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_pattern_insights_detected_at ON public.pattern_insights(detected_at);

ALTER TABLE public.pattern_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patterns" ON public.pattern_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own patterns" ON public.pattern_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert patterns" ON public.pattern_insights FOR INSERT WITH CHECK (true);
```

**4. Paste di SQL Editor**

**5. Klik tombol RUN (atau tekan Ctrl+Enter)**

**6. Tunggu sampai muncul "Success"**

**7. Reply di chat ini: "sudah" atau "done"**

---

## ❌ Kenapa Gak Bisa Otomatis?

Supabase free tier gak expose DDL API. Harus manual via dashboard.

---

## ✅ Setelah Lo Reply "sudah"

Gw langsung (10 menit):

1. Regen types dengan user_feedback
2. Fix 12 TS errors
3. Test pattern detection
4. Test weekly digest
5. Deploy production
6. Verify semua working

---

**Gw nunggu. Kasih tau kapan udah di-run.**
