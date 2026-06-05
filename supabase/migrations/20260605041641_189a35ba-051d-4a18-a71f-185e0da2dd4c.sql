CREATE TABLE public.seo_faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  keywords TEXT[] DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_faqs TO anon, authenticated;
GRANT ALL ON public.seo_faqs TO service_role;

ALTER TABLE public.seo_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published FAQs"
  ON public.seo_faqs FOR SELECT
  USING (published = true);

CREATE INDEX idx_seo_faqs_category ON public.seo_faqs(category);
CREATE INDEX idx_seo_faqs_published_at ON public.seo_faqs(published_at DESC);

CREATE TRIGGER update_seo_faqs_updated_at
  BEFORE UPDATE ON public.seo_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.seo_faqs (slug, title, description, category, keywords, questions) VALUES
('diet-sehat', 'FAQ Diet Sehat', 'Pertanyaan paling sering ditanya seputar diet sehat & turun berat badan.', 'diet',
 ARRAY['diet sehat','turun berat badan','diet pemula'],
 '[
   {"question":"Apa itu diet sehat?","answer":"Diet sehat adalah pola makan seimbang yang memenuhi kebutuhan kalori dan nutrisi tubuh tanpa menghilangkan kelompok makanan utama. Fokus pada makanan utuh, protein, sayur, buah, lemak sehat, dan biji-bijian."},
   {"question":"Berapa lama diet bisa menurunkan berat badan?","answer":"Penurunan berat badan sehat berkisar 0,5–1 kg per minggu. Dalam 1 bulan, target realistis adalah 2–4 kg dengan defisit kalori 300–500 kcal per hari."},
   {"question":"Apakah harus puasa untuk diet?","answer":"Tidak harus. Defisit kalori bisa dicapai dengan mengatur porsi, memilih makanan padat nutrisi, dan tetap makan 3 kali sehari. Intermittent fasting hanya salah satu metode."},
   {"question":"Diet apa yang paling efektif?","answer":"Diet terbaik adalah yang bisa Anda jalani jangka panjang. Mediterania, DASH, dan defisit kalori sederhana terbukti efektif dan berkelanjutan."},
   {"question":"Apakah karbohidrat bikin gemuk?","answer":"Tidak. Yang bikin gemuk adalah surplus kalori total, bukan karbohidrat. Pilih karbo kompleks seperti nasi merah, oats, ubi, dan quinoa."}
 ]'::jsonb),

('kalori-harian', 'FAQ Kalori Harian', 'Semua tentang kebutuhan kalori harian dan cara menghitungnya.', 'kalori',
 ARRAY['kalori harian','kebutuhan kalori','tdee','bmr'],
 '[
   {"question":"Berapa kalori yang dibutuhkan sehari?","answer":"Rata-rata wanita dewasa butuh 1.800–2.200 kcal, pria 2.200–2.800 kcal. Hitungan tepat tergantung berat, tinggi, usia, dan aktivitas (TDEE)."},
   {"question":"Bagaimana cara menghitung kalori harian?","answer":"Gunakan rumus Mifflin-St Jeor untuk BMR lalu kalikan dengan faktor aktivitas (1,2–1,9). Atau pakai kalkulator TDEE di HealthyU."},
   {"question":"Apa itu defisit kalori?","answer":"Defisit kalori berarti makan lebih sedikit daripada yang dibakar tubuh. Defisit 500 kcal/hari ≈ turun 0,5 kg per minggu."},
   {"question":"Apakah kalori semua makanan sama?","answer":"Secara energi ya, tapi kualitas nutrisi berbeda. 200 kcal alpukat lebih mengenyangkan dan bergizi daripada 200 kcal permen."},
   {"question":"Berapa kalori minimal aman per hari?","answer":"Tidak disarankan di bawah 1.200 kcal untuk wanita atau 1.500 kcal untuk pria tanpa pengawasan medis."}
 ]'::jsonb),

('bmi-berat-ideal', 'FAQ BMI & Berat Ideal', 'Penjelasan lengkap BMI, batasan, dan cara menentukan berat ideal.', 'bmi',
 ARRAY['bmi','berat ideal','indeks massa tubuh'],
 '[
   {"question":"Apa itu BMI?","answer":"BMI (Body Mass Index) adalah rasio berat (kg) dibagi tinggi (m) kuadrat. Rentang normal 18,5–24,9."},
   {"question":"Bagaimana cara menghitung BMI?","answer":"BMI = berat (kg) / (tinggi (m) × tinggi (m)). Contoh: 60 kg / (1,65 × 1,65) = 22,0 (normal)."},
   {"question":"Apakah BMI akurat untuk semua orang?","answer":"Tidak. BMI tidak membedakan otot dan lemak. Atlet bisa terdeteksi overweight padahal sehat. Lebih baik kombinasi dengan body fat % dan lingkar pinggang."},
   {"question":"Berapa berat badan ideal saya?","answer":"Pakai rentang BMI 18,5–24,9. Untuk tinggi 165 cm: 50,4–67,8 kg. Hitung di kalkulator berat ideal HealthyU."},
   {"question":"BMI saya 27, bahaya?","answer":"Termasuk overweight. Belum bahaya akut, tapi tingkatkan risiko diabetes, hipertensi, dan jantung. Disarankan turun 5–10% berat badan."}
 ]'::jsonb),

('intermittent-fasting', 'FAQ Intermittent Fasting', 'Panduan FAQ intermittent fasting (puasa) untuk pemula.', 'diet',
 ARRAY['intermittent fasting','puasa','if 16 8'],
 '[
   {"question":"Apa itu intermittent fasting?","answer":"IF adalah pola makan dengan jendela makan terbatas. Metode populer 16:8 (puasa 16 jam, makan 8 jam)."},
   {"question":"Apakah IF aman?","answer":"Aman untuk kebanyakan orang dewasa sehat. Tidak disarankan untuk ibu hamil, menyusui, anak, dan penderita gangguan makan."},
   {"question":"Bolehkah minum air saat puasa IF?","answer":"Boleh. Air putih, teh tawar, kopi hitam tanpa gula tidak membatalkan puasa IF."},
   {"question":"Apakah IF bikin turun berat badan?","answer":"Ya, jika tetap dalam defisit kalori. IF membantu mengurangi total asupan tanpa harus menghitung kalori ketat."},
   {"question":"Berapa lama hasil IF terlihat?","answer":"Umumnya 2–4 minggu konsisten sudah terlihat penurunan 1–3 kg dan perbaikan energi."}
 ]'::jsonb),

('diet-keto', 'FAQ Diet Keto', 'Pertanyaan umum tentang diet ketogenik (rendah karbo, tinggi lemak).', 'diet',
 ARRAY['diet keto','ketogenik','rendah karbo'],
 '[
   {"question":"Apa itu diet keto?","answer":"Diet keto adalah pola makan sangat rendah karbo (<50 g/hari), tinggi lemak (70–80%), protein sedang. Tubuh masuk ketosis dan membakar lemak sebagai energi."},
   {"question":"Apa saja yang boleh dimakan saat keto?","answer":"Daging, ikan, telur, alpukat, keju, minyak zaitun, butter, sayur rendah karbo (bayam, brokoli, kol)."},
   {"question":"Apa yang tidak boleh saat keto?","answer":"Nasi, roti, mie, gula, buah tinggi karbo (pisang, mangga), umbi-umbian, dan kacang-kacangan tertentu."},
   {"question":"Apakah keto aman jangka panjang?","answer":"Studi menunjukkan aman 6–24 bulan untuk kebanyakan orang, tapi perlu pemantauan kolesterol dan ginjal. Konsultasi dokter jika punya kondisi medis."},
   {"question":"Apa itu keto flu?","answer":"Gejala lemas, sakit kepala, mual di minggu pertama keto karena tubuh adaptasi. Atasi dengan cukup air, garam, dan elektrolit."}
 ]'::jsonb),

('olahraga-pemula', 'FAQ Olahraga Pemula', 'Panduan FAQ olahraga untuk pemula yang ingin hidup sehat.', 'olahraga',
 ARRAY['olahraga pemula','workout pemula','olahraga di rumah'],
 '[
   {"question":"Berapa kali olahraga seminggu untuk pemula?","answer":"Mulai 3 kali seminggu, 30 menit per sesi. Tingkatkan bertahap hingga 150 menit kardio + 2 sesi kekuatan per minggu."},
   {"question":"Olahraga apa yang paling efektif bakar kalori?","answer":"Lari, HIIT, dan lompat tali membakar 400–800 kcal/jam. Tapi konsistensi lebih penting daripada intensitas ekstrem."},
   {"question":"Olahraga di rumah apa yang bagus?","answer":"Bodyweight: push-up, squat, plank, burpee, jumping jack. Tambah resistance band atau dumbbell untuk progres."},
   {"question":"Apakah harus ke gym untuk turun berat badan?","answer":"Tidak. Jalan kaki 8.000–10.000 langkah/hari + defisit kalori sudah cukup untuk hasil signifikan."},
   {"question":"Kapan waktu terbaik olahraga?","answer":"Waktu terbaik adalah waktu yang konsisten Anda jalani. Pagi membantu mood, sore meningkatkan performa."}
 ]'::jsonb),

('kebutuhan-air', 'FAQ Kebutuhan Air Harian', 'Berapa air yang harus diminum dan tanda dehidrasi.', 'kesehatan',
 ARRAY['kebutuhan air','minum air putih','dehidrasi'],
 '[
   {"question":"Berapa liter air sehari yang ideal?","answer":"Rumus umum: 30–35 ml × berat badan (kg). Untuk 60 kg ≈ 1,8–2,1 liter/hari. Tambah saat cuaca panas atau olahraga."},
   {"question":"Apakah teh dan kopi termasuk hidrasi?","answer":"Ya, tapi kafein bersifat diuretik ringan. Hitung 80% dari volumenya sebagai hidrasi."},
   {"question":"Tanda kurang minum air?","answer":"Urine kuning pekat, mulut kering, sakit kepala, lemas, kulit kering, sembelit."},
   {"question":"Bahayakah minum terlalu banyak air?","answer":"Bisa. Lebih dari 4–5 liter dalam waktu singkat berisiko hiponatremia (natrium darah turun). Minum bertahap."},
   {"question":"Kapan waktu terbaik minum air?","answer":"Bangun tidur, 30 menit sebelum makan, sebelum-saat-setelah olahraga, dan tiap kali haus."}
 ]'::jsonb),

('tidur-berkualitas', 'FAQ Tidur Berkualitas', 'Panduan tidur sehat dan dampaknya pada berat badan.', 'kesehatan',
 ARRAY['tidur berkualitas','susah tidur','jam tidur ideal'],
 '[
   {"question":"Berapa jam tidur ideal orang dewasa?","answer":"7–9 jam per malam. Kurang dari 6 jam berkaitan dengan kenaikan berat badan, diabetes, dan stres."},
   {"question":"Apakah kurang tidur bikin gemuk?","answer":"Ya. Kurang tidur meningkatkan ghrelin (hormon lapar) dan menurunkan leptin (hormon kenyang), memicu makan berlebih."},
   {"question":"Bagaimana cara tidur lebih cepat?","answer":"Hindari layar 1 jam sebelum tidur, redupkan lampu, suhu kamar 20–22°C, hindari kafein setelah jam 2 siang."},
   {"question":"Apakah tidur siang baik?","answer":"Power nap 10–20 menit meningkatkan fokus. Tidur siang >30 menit bisa ganggu tidur malam."},
   {"question":"Berapa lama deep sleep yang ideal?","answer":"Sekitar 13–23% dari total tidur (1–2 jam untuk tidur 7–8 jam). Olahraga teratur dan rutinitas konsisten meningkatkan deep sleep."}
 ]'::jsonb);