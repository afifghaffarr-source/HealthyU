
-- Recipes: add body_source for seed metadata + lazy AI body generation
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS body_source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS body_generated_at timestamptz;

ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_body_source_check;
ALTER TABLE public.recipes ADD CONSTRAINT recipes_body_source_check
  CHECK (body_source IN ('manual','seed','ai_generated'));

-- Seed metadata-only articles (body_source='seed', content NULL → AI on first open)
INSERT INTO public.articles (slug, title, excerpt, category, body_source, is_published, language, reading_time_minutes)
VALUES
  ('panduan-diet-defisit-kalori-pemula','Panduan Diet Defisit Kalori untuk Pemula','Cara aman memulai defisit kalori tanpa lemas.','diet','seed',true,'id',6),
  ('5-mitos-diet-yang-bikin-gagal','5 Mitos Diet yang Bikin Gagal','Bongkar mitos populer seputar diet di Indonesia.','diet','seed',true,'id',5),
  ('cara-membaca-label-nutrisi','Cara Membaca Label Nutrisi Kemasan','Pahami angka di balik kemasan makananmu.','nutrition','seed',true,'id',5),
  ('hidrasi-berapa-air-yang-anda-butuhkan','Hidrasi: Berapa Banyak Air yang Anda Butuhkan?','Panduan kebutuhan cairan harian per individu.','nutrition','seed',true,'id',4),
  ('mengenal-makronutrien-karbo-protein-lemak','Mengenal Makronutrien: Karbo, Protein, Lemak','Fungsi & porsi ideal masing-masing makronutrien.','nutrition','seed',true,'id',6),
  ('intermittent-fasting-aman-untuk-siapa','Intermittent Fasting: Aman untuk Siapa?','Risiko, manfaat, dan siapa yang sebaiknya hindari.','diet','seed',true,'id',7),
  ('puasa-diabetes-amankah','Puasa & Diabetes: Amankah?','Panduan berpuasa bagi penderita diabetes.','health','seed',true,'id',7),
  ('hubungan-tidur-dan-berat-badan','Hubungan Tidur & Berat Badan','Bagaimana kurang tidur menggagalkan diet.','mental','seed',true,'id',5),
  ('mengelola-stress-saat-diet','Mengelola Stress saat Diet','Teknik praktis cegah emotional eating.','mental','seed',true,'id',5),
  ('body-positivity-dan-diet-sehat','Body Positivity & Diet Sehat','Mencintai diri sambil tetap bergerak ke target sehat.','mental','seed',true,'id',5),
  ('workout-rumahan-tanpa-alat','Workout Rumahan Tanpa Alat','Rutinitas 20 menit untuk pemula.','fitness','seed',true,'id',5),
  ('jalan-kaki-10000-langkah-perlukah','Jalan Kaki 10.000 Langkah: Perlukah?','Apa kata sains tentang target langkah harian.','fitness','seed',true,'id',5),
  ('cara-mulai-strength-training','Cara Mulai Strength Training','Panduan awal angkat beban yang aman.','fitness','seed',true,'id',6),
  ('mindful-eating-makan-dengan-sadar','Mindful Eating: Makan dengan Sadar','Latihan praktis untuk mengurangi makan berlebih.','mental','seed',true,'id',5),
  ('serat-mengapa-penting-untuk-diet','Serat: Mengapa Penting untuk Diet','Sumber serat lokal yang murah & mengenyangkan.','nutrition','seed',true,'id',5)
ON CONFLICT (slug) DO NOTHING;

-- Seed metadata-only recipes
INSERT INTO public.recipes (slug, title, description, category, calories, protein_g, carbs_g, fat_g, prep_min, cook_min, total_min, servings, ingredients, instructions, is_indonesian, body_source, is_published)
VALUES
  ('nasi-merah-ayam-bakar-rendah-kalori','Nasi Merah & Ayam Bakar Rendah Kalori','Menu makan siang sehat khas Indonesia.','main',420,35,45,10,15,20,35,1,'{}','{}',true,'seed',true),
  ('sup-ayam-jahe-hangat','Sup Ayam Jahe Hangat','Penambah imun saat cuaca dingin.','soup',280,28,15,8,10,25,35,1,'{}','{}',true,'seed',true),
  ('salad-buah-yogurt','Salad Buah dengan Yogurt','Sarapan segar tinggi serat.','breakfast',220,8,38,4,10,0,10,1,'{}','{}',true,'seed',true),
  ('oatmeal-pisang-kayu-manis','Oatmeal Pisang Kayu Manis','Sarapan kenyang lama.','breakfast',310,10,55,6,5,5,10,1,'{}','{}',true,'seed',true),
  ('smoothie-bayam-pisang','Smoothie Bayam Pisang','Detox alami pagi hari.','snack',180,6,32,2,5,0,5,1,'{}','{}',true,'seed',true),
  ('gado-gado-sehat','Gado-Gado Sehat','Versi rendah kalori menu klasik Indonesia.','main',380,18,42,16,20,10,30,1,'{}','{}',true,'seed',true),
  ('tumis-tahu-brokoli','Tumis Tahu Brokoli','Lauk vegetarian tinggi protein.','main',260,18,18,12,10,10,20,1,'{}','{}',true,'seed',true),
  ('soto-ayam-rendah-lemak','Soto Ayam Rendah Lemak','Comfort food tanpa rasa bersalah.','soup',320,26,28,10,15,30,45,1,'{}','{}',true,'seed',true),
  ('telur-dadar-sayuran','Telur Dadar Sayuran','Sarapan cepat tinggi protein.','breakfast',240,18,8,16,5,8,13,1,'{}','{}',true,'seed',true),
  ('ikan-bakar-bumbu-rica','Ikan Bakar Bumbu Rica','Sumber omega-3 ala Manado.','main',310,32,6,18,15,20,35,1,'{}','{}',true,'seed',true),
  ('bubur-kacang-hijau-rendah-gula','Bubur Kacang Hijau Rendah Gula','Camilan tradisional tinggi serat.','snack',220,9,40,3,10,25,35,1,'{}','{}',true,'seed',true),
  ('pepes-tahu-jamur','Pepes Tahu Jamur','Lauk kukus rendah kalori.','main',230,17,12,12,15,25,40,1,'{}','{}',true,'seed',true),
  ('overnight-oats-coklat','Overnight Oats Coklat','Siapkan malam, sarap pagi.','breakfast',340,12,52,9,5,0,5,1,'{}','{}',true,'seed',true),
  ('capcay-kuah-bening','Capcay Kuah Bening','Sayur lengkap rendah kalori.','main',180,10,22,4,15,10,25,1,'{}','{}',true,'seed',true),
  ('puding-chia-mangga','Puding Chia Mangga','Dessert sehat tinggi omega-3.','snack',210,6,28,8,5,0,5,1,'{}','{}',true,'seed',true)
ON CONFLICT (slug) DO NOTHING;
