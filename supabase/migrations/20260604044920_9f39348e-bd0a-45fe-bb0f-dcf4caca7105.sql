-- ============ seo_exercises ============
CREATE TABLE public.seo_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  category text,
  met numeric(4,2) NOT NULL,
  description text,
  muscle_groups text[] DEFAULT '{}',
  equipment text,
  difficulty text,
  tags text[] DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_exercises TO anon, authenticated;
GRANT ALL ON public.seo_exercises TO service_role;
ALTER TABLE public.seo_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published exercises" ON public.seo_exercises FOR SELECT USING (published = true);
CREATE INDEX seo_exercises_category_idx ON public.seo_exercises(category) WHERE published;
CREATE TRIGGER seo_exercises_updated_at BEFORE UPDATE ON public.seo_exercises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ seo_diet_guides ============
CREATE TABLE public.seo_diet_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  short_description text,
  description text,
  pros text[] DEFAULT '{}',
  cons text[] DEFAULT '{}',
  who_for text,
  sample_day text,
  tags text[] DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_diet_guides TO anon, authenticated;
GRANT ALL ON public.seo_diet_guides TO service_role;
ALTER TABLE public.seo_diet_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published diets" ON public.seo_diet_guides FOR SELECT USING (published = true);
CREATE TRIGGER seo_diet_guides_updated_at BEFORE UPDATE ON public.seo_diet_guides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ seed exercises (30) ============
INSERT INTO public.seo_exercises (slug,name,category,met,description,muscle_groups,equipment,difficulty,tags) VALUES
('jalan-kaki','Jalan Kaki','kardio',3.5,'Jalan kaki santai dengan kecepatan 5 km/jam, ideal untuk pemula dan aktivitas harian.','{"kaki","betis"}','tanpa alat','mudah','{"kardio","pemula"}'),
('jalan-cepat','Jalan Cepat','kardio',4.3,'Jalan cepat 6,5 km/jam untuk membakar kalori lebih efektif.','{"kaki","glute"}','tanpa alat','mudah','{"kardio"}'),
('lari-santai','Lari Santai (Jogging)','kardio',7.0,'Lari ringan 8 km/jam, baik untuk kesehatan jantung.','{"kaki","core"}','tanpa alat','sedang','{"kardio","jogging"}'),
('lari-cepat','Lari Cepat','kardio',11.5,'Lari 12 km/jam, pembakaran kalori tinggi.','{"kaki","core"}','tanpa alat','sulit','{"kardio"}'),
('sepeda-santai','Sepeda Santai','kardio',4.0,'Bersepeda santai 15-20 km/jam di jalan datar.','{"kaki","glute"}','sepeda','mudah','{"kardio","outdoor"}'),
('sepeda-cepat','Sepeda Cepat','kardio',8.0,'Bersepeda 20-25 km/jam dengan intensitas tinggi.','{"kaki","glute","core"}','sepeda','sedang','{"kardio"}'),
('renang-santai','Renang Santai','kardio',6.0,'Renang gaya bebas santai, latihan seluruh tubuh.','{"bahu","punggung","kaki"}','kolam renang','sedang','{"kardio","full-body"}'),
('renang-cepat','Renang Cepat','kardio',9.8,'Renang cepat membakar kalori sangat tinggi.','{"bahu","punggung","kaki","core"}','kolam renang','sulit','{"kardio"}'),
('yoga','Yoga','fleksibilitas',2.5,'Latihan yoga hatha untuk fleksibilitas dan mindfulness.','{"core","punggung"}','matras','mudah','{"flex","mindfulness"}'),
('pilates','Pilates','kekuatan',3.0,'Latihan core dan postur dengan kontrol napas.','{"core","punggung"}','matras','sedang','{"flex","core"}'),
('zumba','Zumba','kardio',6.5,'Senam aerobik bernuansa dansa Latin.','{"kaki","core"}','tanpa alat','sedang','{"kardio","dance"}'),
('aerobik','Aerobik','kardio',7.3,'Senam aerobik intensitas sedang-tinggi.','{"full-body"}','tanpa alat','sedang','{"kardio"}'),
('hiit','HIIT','kardio',9.0,'High Intensity Interval Training 20-30 menit.','{"full-body"}','tanpa alat','sulit','{"kardio","fat-burn"}'),
('angkat-beban-ringan','Angkat Beban Ringan','kekuatan',3.5,'Latihan beban dengan repetisi tinggi, intensitas ringan.','{"full-body"}','dumbbell','mudah','{"strength"}'),
('angkat-beban-berat','Angkat Beban Berat','kekuatan',6.0,'Latihan kekuatan compound dengan beban berat.','{"full-body"}','barbell','sulit','{"strength"}'),
('push-up','Push Up','kekuatan',8.0,'Latihan dada, bahu, dan triceps tanpa alat.','{"dada","bahu","triceps"}','tanpa alat','sedang','{"bodyweight"}'),
('pull-up','Pull Up','kekuatan',8.0,'Latihan punggung dan biceps menggunakan pull-up bar.','{"punggung","biceps"}','pull-up bar','sulit','{"bodyweight"}'),
('squat','Squat','kekuatan',5.0,'Latihan paha, glute, dan core.','{"paha","glute","core"}','tanpa alat','mudah','{"bodyweight"}'),
('plank','Plank','kekuatan',3.0,'Latihan isometrik untuk core stability.','{"core"}','matras','mudah','{"core"}'),
('burpee','Burpee','kardio',8.0,'Latihan full-body intensitas tinggi.','{"full-body"}','tanpa alat','sulit','{"hiit","kardio"}'),
('jumping-jack','Jumping Jack','kardio',8.0,'Loncat sambil membuka tutup tangan dan kaki.','{"kaki","bahu"}','tanpa alat','mudah','{"warmup","kardio"}'),
('mountain-climber','Mountain Climber','kardio',8.0,'Plank dinamis menggerakkan lutut ke dada.','{"core","kaki"}','tanpa alat','sedang','{"hiit"}'),
('sit-up','Sit Up','kekuatan',8.0,'Latihan perut klasik.','{"core"}','matras','mudah','{"core"}'),
('badminton','Badminton','olahraga',5.5,'Permainan bulu tangkis rekreasional.','{"kaki","bahu"}','raket','sedang','{"sport"}'),
('futsal','Futsal','olahraga',8.0,'Sepak bola dalam ruangan, intensitas tinggi.','{"kaki","core"}','bola','sedang','{"sport"}'),
('basket','Basket','olahraga',6.5,'Permainan basket rekreasional.','{"kaki","bahu"}','bola','sedang','{"sport"}'),
('tenis','Tenis','olahraga',7.3,'Tenis single, kardio + reaksi.','{"kaki","bahu"}','raket','sedang','{"sport"}'),
('hiking','Hiking','outdoor',6.0,'Mendaki gunung/bukit ringan.','{"kaki","core"}','sepatu hiking','sedang','{"outdoor"}'),
('skipping','Lompat Tali','kardio',12.3,'Skipping cepat, salah satu kardio terbaik.','{"kaki","bahu"}','tali skipping','sedang','{"kardio","fat-burn"}'),
('peregangan','Peregangan / Stretching','fleksibilitas',2.3,'Stretching statis dan dinamis.','{"full-body"}','tanpa alat','mudah','{"flex","cooldown"}');

-- ============ seed diet guides (10) ============
INSERT INTO public.seo_diet_guides (slug,name,short_description,description,pros,cons,who_for,sample_day,tags) VALUES
('keto','Diet Keto','Diet rendah karbohidrat & tinggi lemak untuk masuk ke kondisi ketosis.','Diet ketogenik membatasi karbohidrat di bawah 50g/hari, mendorong tubuh membakar lemak sebagai energi utama (ketosis). Komposisi: ~70% lemak, 25% protein, 5% karbohidrat.','{"Turun berat badan cepat","Mengontrol gula darah","Mengurangi nafsu makan"}','{"Keto flu di minggu awal","Pilihan makanan terbatas","Sulit jangka panjang"}','Orang dewasa sehat yang ingin turun BB cepat. Tidak untuk ibu hamil, penderita ginjal.','Pagi: telur orak-arik + alpukat. Siang: ayam panggang + brokoli + olive oil. Malam: salmon + bayam tumis mentega.','{"keto","low-carb"}'),
('intermittent-fasting','Intermittent Fasting (IF)','Pola makan dengan jendela puasa & makan terjadwal (16:8, 18:6, dll).','IF mengatur KAPAN makan, bukan apa. Metode populer: 16:8 (puasa 16 jam, makan 8 jam). Saat puasa hanya boleh air, kopi/teh tanpa gula.','{"Sederhana, tanpa hitung kalori","Meningkatkan sensitivitas insulin","Bisa dikombinasi diet lain"}','{"Lapar di awal adaptasi","Tidak cocok penderita maag akut","Bisa picu binge"}','Orang sehat tanpa riwayat gangguan makan. Hindari jika hamil atau diabetes tipe 1.','Jendela 12:00-20:00. 12:00: nasi + ayam + sayur. 16:00: buah + yogurt. 19:30: ikan + tumis sayur.','{"if","puasa"}'),
('mediterania','Diet Mediterania','Pola makan kaya sayur, ikan, olive oil, dan biji-bijian utuh.','Terinspirasi pola makan negara Mediterania (Yunani, Italia). Fokus: sayur, buah, ikan, kacang, olive oil; minim daging merah & gula.','{"Bukti riset terkuat untuk jantung","Berkelanjutan jangka panjang","Tidak ketat"}','{"Olive oil & ikan bisa mahal","Turun BB lebih lambat"}','Semua usia, terutama yang ingin gaya hidup sehat jangka panjang.','Pagi: oatmeal + buah + kacang. Siang: salad tuna + olive oil + roti gandum. Malam: ikan panggang + sayur + quinoa.','{"sehat-jantung","sustainable"}'),
('dash','Diet DASH','Dietary Approaches to Stop Hypertension—rendah garam, tinggi sayur & buah.','Diet untuk menurunkan tekanan darah. Batasi garam (<2300mg/hari), perbanyak sayur, buah, biji-bijian, protein rendah lemak.','{"Menurunkan tekanan darah","Baik untuk jantung","Bergizi seimbang"}','{"Perlu kebiasaan baca label gizi","Memasak sendiri lebih sering"}','Penderita hipertensi atau pre-hipertensi, atau pencegahan.','Pagi: oatmeal + pisang + susu rendah lemak. Siang: nasi merah + ayam tanpa kulit + sayur. Malam: ikan + kentang rebus + brokoli.','{"hipertensi","jantung"}'),
('defisit-kalori','Defisit Kalori','Makan lebih sedikit kalori dari yang dibakar—prinsip dasar turun BB.','Defisit 300-500 kkal/hari memberikan penurunan BB ~0,3-0,5 kg/minggu. Aman & fleksibel; semua jenis makanan boleh asal masuk target.','{"Fleksibel & berkelanjutan","Bisa dipadukan diet apapun","Berbasis sains"}','{"Perlu tracking kalori","Lapar jika defisit terlalu agresif"}','Siapa saja yang ingin turun BB sehat tanpa pantangan ekstrem.','Total target ~1500 kkal. Pagi 400, Siang 500, Malam 500, Snack 100.','{"defisit","weight-loss"}'),
('low-carb','Diet Rendah Karbohidrat','Membatasi karbohidrat 50-130g/hari tanpa harus seketat keto.','Versi lebih moderat dari keto. Kurangi nasi, roti, pasta; perbanyak protein, sayur non-tepung, lemak sehat.','{"Lebih fleksibel dari keto","Turunkan gula darah & trigliserida","Mengurangi kembung"}','{"Energi turun di awal","Sulit bagi pencinta nasi"}','Orang dengan resistensi insulin, pra-diabetes, atau yang ingin turun BB.','Pagi: telur + sayur. Siang: ayam + salad besar. Malam: ikan + tumis brokoli + sedikit kentang.','{"low-carb"}'),
('vegan','Diet Vegan','Pola makan nabati penuh, tanpa produk hewani.','Hanya konsumsi tumbuhan: sayur, buah, biji, kacang, biji-bijian. Tanpa daging, susu, telur, madu.','{"Tinggi serat & antioksidan","Ramah lingkungan","Risiko penyakit jantung lebih rendah"}','{"Perlu suplemen B12","Risiko kurang protein/zat besi jika tidak direncanakan"}','Yang ingin pola makan etis & nabati. Wajib perhatikan B12, omega-3, zat besi.','Pagi: smoothie pisang + chia + selai kacang. Siang: nasi + tempe + sayur. Malam: pasta + saus tomat + kacang merah.','{"vegan","plant-based"}'),
('vegetarian','Diet Vegetarian','Tanpa daging, tapi boleh telur dan susu.','Lebih fleksibel dari vegan. Sumber protein: telur, susu, tahu, tempe, kacang-kacangan.','{"Lebih mudah dari vegan","Tetap kaya nutrisi","Baik untuk lingkungan"}','{"Tetap perlu rencanakan protein","Risiko kurang zat besi"}','Yang ingin mengurangi daging tapi belum siap vegan total.','Pagi: telur + roti gandum. Siang: nasi + tahu kecap + sayur. Malam: sup kacang merah + nasi merah.','{"vegetarian"}'),
('paleo','Diet Paleo','Pola makan ala manusia purba—daging, ikan, sayur, buah, kacang.','Hindari makanan olahan, gandum, susu, gula, kacang polong (legume). Fokus makanan utuh ala pra-pertanian.','{"Makanan utuh & minim olahan","Mengurangi gula & natrium","Bisa turunkan BB"}','{"Tanpa biji-bijian & legume","Bisa mahal","Sulit untuk vegetarian"}','Yang ingin makan whole-food dan menghindari makanan olahan.','Pagi: telur + alpukat. Siang: steak + ubi + brokoli. Malam: ikan bakar + salad.','{"paleo","whole-food"}'),
('flexitarian','Diet Flexitarian','Mayoritas nabati, sesekali tetap makan daging.','Versi fleksibel dari vegetarian. Fokus tumbuhan, daging hanya 1-2x/minggu sebagai pelengkap.','{"Mudah dijalani","Lingkungan & kesehatan","Tidak terlalu membatasi"}','{"Tidak ada panduan ketat","Perlu disiplin sendiri"}','Yang ingin kurangi daging perlahan untuk kesehatan & lingkungan.','Pagi: oatmeal + buah. Siang: salad quinoa + tempe. Malam (2x/minggu): ikan/ayam + sayur.','{"flexitarian","sustainable"}');
