CREATE TABLE public.seo_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  author_name TEXT DEFAULT 'Tim HealthyU',
  image_url TEXT,
  reading_time_minutes INT DEFAULT 5,
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_articles TO anon, authenticated;
GRANT ALL ON public.seo_articles TO service_role;

ALTER TABLE public.seo_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published articles"
  ON public.seo_articles FOR SELECT
  USING (published = true);

CREATE POLICY "Service role manages articles"
  ON public.seo_articles FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX seo_articles_category_idx ON public.seo_articles(category) WHERE published;
CREATE INDEX seo_articles_published_idx ON public.seo_articles(published_at DESC) WHERE published;

CREATE TRIGGER seo_articles_updated_at
  BEFORE UPDATE ON public.seo_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.seo_articles (slug, title, excerpt, content, category, tags, keywords, reading_time_minutes) VALUES
('cara-turun-berat-badan-sehat', 'Cara Turun Berat Badan Sehat dan Cepat', 'Panduan lengkap menurunkan berat badan dengan cara sehat, berkelanjutan, dan tanpa efek samping.', E'# Cara Turun Berat Badan Sehat\n\nMenurunkan berat badan secara sehat memerlukan kombinasi pola makan, olahraga, dan gaya hidup.\n\n## 1. Defisit Kalori\nKonsumsi kalori 300-500 kkal di bawah TDEE untuk turun 0.5 kg/minggu.\n\n## 2. Protein Tinggi\nKonsumsi 1.6-2.2 g protein per kg berat badan untuk menjaga otot.\n\n## 3. Olahraga Rutin\nKombinasikan kardio (3x/minggu) dan latihan beban (3x/minggu).\n\n## 4. Tidur Cukup\nTidur 7-9 jam mendukung metabolisme dan kontrol nafsu makan.', 'diet', ARRAY['diet','berat badan','sehat'], ARRAY['cara turun berat badan','diet sehat','kurus','BB ideal'], 6),
('manfaat-puasa-intermittent', 'Manfaat Puasa Intermittent (IF) untuk Kesehatan', '16:8, 18:6, OMAD - kenali manfaat dan cara mulai intermittent fasting dengan aman.', E'# Manfaat Intermittent Fasting\n\n## Apa itu IF?\nPola makan dengan jendela makan terbatas (8 jam) dan puasa (16 jam).\n\n## Manfaat\n- Turun berat badan\n- Sensitivitas insulin meningkat\n- Autofagi (perbaikan sel)\n- Fokus mental lebih tajam\n\n## Cara Mulai\nMulai 12:12, naik bertahap ke 14:10, lalu 16:8.', 'diet', ARRAY['puasa','if','intermittent fasting'], ARRAY['intermittent fasting','puasa 16 jam','diet IF','manfaat puasa'], 5),
('diet-keto-pemula', 'Panduan Diet Keto untuk Pemula', 'Apa itu diet keto, makanan yang boleh dan dilarang, plus contoh menu 7 hari.', E'# Diet Keto Pemula\n\n## Prinsip\nKarbohidrat <50g/hari, lemak 70-75%, protein 20-25%.\n\n## Makanan yang Boleh\n- Daging, ikan, telur\n- Alpukat, minyak zaitun, mentega\n- Sayur hijau\n\n## Yang Dilarang\nNasi, roti, gula, buah manis.', 'diet', ARRAY['keto','low carb'], ARRAY['diet keto','keto pemula','menu keto','makanan keto'], 7),
('olahraga-pemula-rumah', 'Olahraga di Rumah untuk Pemula (Tanpa Alat)', 'Rutinitas 20 menit/hari yang bisa kamu lakukan tanpa alat di rumah.', E'# Olahraga di Rumah Pemula\n\n## Rutin 20 Menit\n1. Jumping jack 1 menit\n2. Push up 10x\n3. Squat 15x\n4. Plank 30 detik\n5. Mountain climber 30 detik\n\nUlangi 3 set.', 'olahraga', ARRAY['olahraga','rumah','pemula'], ARRAY['olahraga di rumah','workout pemula','tanpa alat'], 4),
('cara-menambah-berat-badan', 'Cara Menambah Berat Badan Sehat', 'Surplus kalori, latihan beban, dan protein cukup untuk naik BB tanpa lemak berlebih.', E'# Cara Menambah Berat Badan\n\n## Surplus Kalori\nMakan 300-500 kkal di atas TDEE.\n\n## Latihan Beban\nFokus compound: squat, deadlift, bench press 3-4x/minggu.\n\n## Protein\n2g per kg BB, dari ayam, telur, ikan, tempe.', 'nutrisi', ARRAY['BB','naik berat'], ARRAY['cara menambah berat badan','gemuk sehat','naik BB'], 5),
('berapa-kalori-sehari', 'Berapa Kalori yang Dibutuhkan Sehari?', 'Cara menghitung kebutuhan kalori harian berdasarkan BMR, aktivitas, dan tujuan.', E'# Kebutuhan Kalori Harian\n\n## Rumus Mifflin-St Jeor\n- Pria: (10×BB) + (6.25×TB) - (5×umur) + 5\n- Wanita: (10×BB) + (6.25×TB) - (5×umur) - 161\n\n## TDEE = BMR × Aktivitas\n- Sedentary: ×1.2\n- Ringan: ×1.375\n- Sedang: ×1.55\n- Aktif: ×1.725\n\nGunakan kalkulator kami di /kalkulator/tdee.', 'nutrisi', ARRAY['kalori','tdee','bmr'], ARRAY['kebutuhan kalori','kalori harian','tdee','bmr'], 4),
('makanan-tinggi-protein', '15 Makanan Tinggi Protein untuk Diet', 'Sumber protein hewani dan nabati terbaik untuk membantu penurunan berat badan.', E'# 15 Makanan Tinggi Protein\n\n1. Dada ayam (31g/100g)\n2. Telur (13g/100g)\n3. Ikan tuna (28g/100g)\n4. Greek yogurt (10g/100g)\n5. Tempe (19g/100g)\n6. Tahu (8g/100g)\n7. Kacang almond (21g/100g)\n8. Daging sapi tanpa lemak (26g/100g)\n9. Salmon (25g/100g)\n10. Cottage cheese (11g/100g)\n11. Lentil (9g/100g)\n12. Edamame (11g/100g)\n13. Susu (3.4g/100g)\n14. Quinoa (4.4g/100g)\n15. Whey protein (80g/100g)', 'nutrisi', ARRAY['protein','diet'], ARRAY['makanan tinggi protein','sumber protein','protein diet'], 5),
('manfaat-minum-air-putih', 'Manfaat Minum Air Putih 8 Gelas Sehari', 'Hidrasi optimal untuk metabolisme, kulit, dan energi sepanjang hari.', E'# Manfaat Air Putih\n\n## Manfaat\n- Metabolisme lancar\n- Kulit sehat & glowing\n- Membantu turun berat badan\n- Mencegah dehidrasi\n- Detox alami\n\n## Tips\nMinum 1 gelas saat bangun, sebelum makan, dan sebelum tidur.', 'nutrisi', ARRAY['hidrasi','air'], ARRAY['manfaat air putih','hidrasi','minum air'], 3),
('cara-tidur-berkualitas', 'Cara Mendapatkan Tidur Berkualitas 7-9 Jam', 'Sleep hygiene untuk pemulihan optimal dan kesehatan mental.', E'# Tidur Berkualitas\n\n## Tips\n1. Jam tidur konsisten\n2. Hindari layar 1 jam sebelum tidur\n3. Suhu kamar 18-22°C\n4. Hindari kafein setelah jam 14:00\n5. Olahraga rutin (bukan malam)\n\n## Manfaat\nMemori, mood, imun, regenerasi otot.', 'kesehatan', ARRAY['tidur','sleep'], ARRAY['cara tidur nyenyak','sleep hygiene','tidur berkualitas'], 4),
('diet-mediterania-jantung', 'Diet Mediterania untuk Kesehatan Jantung', 'Pola makan terbukti turunkan risiko penyakit jantung dan diabetes.', E'# Diet Mediterania\n\n## Prinsip\n- Sayur & buah melimpah\n- Minyak zaitun extra virgin\n- Ikan 2-3x/minggu\n- Kacang-kacangan harian\n- Daging merah minim\n\n## Manfaat\nTurunkan kolesterol, tekanan darah, risiko stroke.', 'diet', ARRAY['mediterania','jantung'], ARRAY['diet mediterania','sehat jantung','diet jantung'], 5),
('olahraga-kardio-vs-beban', 'Kardio vs Latihan Beban: Mana Lebih Efektif?', 'Perbandingan lengkap untuk turun berat badan, bentuk tubuh, dan kesehatan.', E'# Kardio vs Beban\n\n## Kardio\n- Bakar kalori cepat\n- Sehat jantung\n- Mood booster\n\n## Beban\n- Bangun otot → metabolisme naik\n- Bentuk tubuh\n- Cegah osteoporosis\n\n## Rekomendasi\nKombinasi 3x kardio + 3x beban/minggu.', 'olahraga', ARRAY['kardio','beban','gym'], ARRAY['kardio vs beban','latihan terbaik','olahraga turun BB'], 5),
('makanan-detoks-alami', '10 Makanan Detoks Alami untuk Tubuh', 'Bukan jus diet ekstrem - ini makanan yang benar-benar membantu detoks alami.', E'# 10 Makanan Detoks Alami\n\n1. Lemon\n2. Bayam\n3. Brokoli\n4. Bawang putih\n5. Jahe\n6. Kunyit\n7. Teh hijau\n8. Apel\n9. Bit\n10. Air putih\n\nDetoks sejati = hati & ginjal sehat, bukan jus 3 hari.', 'nutrisi', ARRAY['detoks','sehat'], ARRAY['makanan detoks','detoks alami','detox'], 4);