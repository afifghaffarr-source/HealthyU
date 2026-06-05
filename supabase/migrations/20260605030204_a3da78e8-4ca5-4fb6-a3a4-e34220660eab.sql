
CREATE TABLE public.seo_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  cuisine TEXT DEFAULT 'Indonesia',
  image_url TEXT,
  prep_min INTEGER,
  cook_min INTEGER,
  total_min INTEGER,
  servings INTEGER DEFAULT 1,
  calories INTEGER,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  fiber_g NUMERIC,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  instructions TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  is_vegan BOOLEAN DEFAULT false,
  is_vegetarian BOOLEAN DEFAULT false,
  is_halal BOOLEAN DEFAULT true,
  published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_recipes TO anon, authenticated;
GRANT ALL ON public.seo_recipes TO service_role;

ALTER TABLE public.seo_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published seo_recipes"
  ON public.seo_recipes FOR SELECT
  USING (published = true);

CREATE INDEX seo_recipes_category_idx ON public.seo_recipes(category) WHERE published;
CREATE INDEX seo_recipes_published_at_idx ON public.seo_recipes(published_at DESC) WHERE published;

CREATE TRIGGER seo_recipes_updated_at
  BEFORE UPDATE ON public.seo_recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.seo_recipes (slug,title,description,category,image_url,prep_min,cook_min,total_min,servings,calories,protein_g,carbs_g,fat_g,fiber_g,ingredients,instructions,tags,keywords,is_vegetarian) VALUES
('gado-gado-sehat','Gado-Gado Sehat Rendah Kalori','Salad sayur Indonesia dengan bumbu kacang rendah lemak, kaya serat dan protein nabati.','Salad','/images/recipes/gado-gado.jpg',15,15,30,2,320,14,38,12,8,
 ARRAY['200g tauge','150g kacang panjang','100g kol','2 butir telur rebus','100g tahu','100g tempe','3 sdm selai kacang','1 sdm kecap manis','1 buah jeruk limau','2 siung bawang putih','Cabe sesuai selera'],
 ARRAY['Rebus semua sayuran sebentar agar tetap renyah','Goreng tahu & tempe dengan sedikit minyak','Haluskan bumbu kacang dengan air hangat','Tata sayuran, tahu, tempe, telur','Siram bumbu kacang dan beri kerupuk'],
 ARRAY['vegetarian','tinggi-serat','indonesia'],
 ARRAY['resep gado gado','gado gado sehat','resep diet indonesia'], true),
('sup-ayam-bening','Sup Ayam Bening Rendah Lemak','Sup ayam segar tanpa santan, cocok untuk diet dan pemulihan.','Sup','/images/recipes/sup-ayam.jpg',10,30,40,4,180,22,8,5,2,
 ARRAY['300g dada ayam','2 wortel','100g buncis','2 batang seledri','1 batang daun bawang','4 siung bawang putih','1 ruas jahe','Garam & merica'],
 ARRAY['Rebus ayam hingga empuk, buang busa','Tumis bawang putih & jahe, masukkan ke kuah','Tambah wortel & buncis, masak 10 menit','Bumbui garam & merica','Taburi daun bawang & seledri'],
 ARRAY['rendah-kalori','tinggi-protein','sehat'],
 ARRAY['sup ayam diet','resep sup sehat','sup ayam bening'], false),
('oatmeal-pisang','Oatmeal Pisang Madu','Sarapan sehat tinggi serat dengan oatmeal, pisang, dan madu.','Sarapan','/images/recipes/oatmeal.jpg',5,5,10,1,310,9,58,7,7,
 ARRAY['50g rolled oats','200ml susu rendah lemak','1 buah pisang','1 sdm madu','1 sdm kacang almond','Kayu manis bubuk'],
 ARRAY['Masak oats dengan susu 5 menit','Tuang ke mangkuk','Topping pisang iris, madu, almond, kayu manis'],
 ARRAY['sarapan','vegetarian','tinggi-serat'],
 ARRAY['oatmeal pisang','sarapan sehat','resep oats'], true),
('tumis-kangkung','Tumis Kangkung Bawang Putih','Tumisan kangkung cepat saji, rendah kalori, tinggi zat besi.','Sayur','/images/recipes/kangkung.jpg',5,10,15,3,90,4,10,4,3,
 ARRAY['1 ikat kangkung','5 siung bawang putih','3 cabe rawit','1 sdm saus tiram','1 sdt minyak wijen','Garam'],
 ARRAY['Cuci kangkung, potong-potong','Tumis bawang putih & cabe hingga harum','Masukkan kangkung, aduk cepat','Tambah saus tiram & garam','Tetesi minyak wijen, sajikan'],
 ARRAY['rendah-kalori','vegan','cepat'],
 ARRAY['tumis kangkung','resep sayur sehat','kangkung bawang putih'], true),
('salad-sayur-segar','Salad Sayur Dressing Lemon','Salad sayur segar dengan dressing lemon olive oil, cocok untuk diet.','Salad','/images/recipes/salad.jpg',10,0,10,2,150,4,12,10,5,
 ARRAY['100g selada','1 buah tomat','1 buah timun','1/2 buah alpukat','50g jagung manis rebus','2 sdm olive oil','1 sdm air lemon','Garam & merica'],
 ARRAY['Potong semua sayur','Campur olive oil, lemon, garam, merica','Tata sayur, siram dressing','Sajikan segera'],
 ARRAY['salad','vegan','rendah-karbo','diet'],
 ARRAY['salad sehat','resep salad diet','salad sayur'], true),
('dada-ayam-panggang','Dada Ayam Panggang Bumbu Lemon','Dada ayam panggang tinggi protein, rendah lemak untuk diet & gym.','Daging','/images/recipes/grilled-chicken.jpg',10,20,30,2,250,38,2,10,0,
 ARRAY['300g dada ayam fillet','1 sdm olive oil','1 sdt garam','1 sdt merica','2 siung bawang putih cincang','1 sdm air lemon','1 sdt paprika bubuk'],
 ARRAY['Lumuri ayam dengan semua bumbu','Diamkan 15 menit di kulkas','Panggang di teflon/oven 8-10 menit per sisi','Sajikan dengan sayur kukus'],
 ARRAY['tinggi-protein','rendah-karbo','diet','gym'],
 ARRAY['dada ayam panggang','resep diet protein','ayam panggang sehat'], false),
('smoothie-buah-berry','Smoothie Buah Berry Yogurt','Smoothie berry dengan yogurt rendah lemak, kaya antioksidan.','Minuman','/images/recipes/smoothie.jpg',5,0,5,1,220,10,38,3,6,
 ARRAY['150g strawberry beku','50g blueberry','150g yogurt rendah lemak','1 sdm madu','100ml susu almond','Es batu'],
 ARRAY['Masukkan semua bahan ke blender','Blender hingga halus','Tuang ke gelas, sajikan dingin'],
 ARRAY['minuman','sarapan','vegetarian','antioksidan'],
 ARRAY['smoothie sehat','smoothie diet','resep smoothie buah'], true),
('tahu-bacem','Tahu Bacem Sehat','Tahu bacem manis gurih khas Jawa, kaya protein nabati.','Lauk','/images/recipes/tahu-bacem.jpg',10,30,40,4,140,9,12,6,3,
 ARRAY['400g tahu putih','3 lembar daun salam','1 ruas lengkuas','3 siung bawang putih','5 butir bawang merah','2 sdm kecap manis','1 sdt garam','500ml air kelapa'],
 ARRAY['Haluskan bawang merah & putih','Rebus tahu dengan bumbu & air kelapa','Masak hingga air menyusut','Panggang/goreng sebentar sebelum sajikan'],
 ARRAY['vegetarian','protein-nabati','indonesia'],
 ARRAY['tahu bacem','resep tahu sehat','tahu bacem jawa'], true),
('nasi-merah-ayam-suwir','Nasi Merah Ayam Suwir','Nasi merah dengan ayam suwir bumbu kuning, menu diet kenyang lama.','Makan Besar','/images/recipes/nasi-merah.jpg',15,25,40,2,420,30,55,8,6,
 ARRAY['150g nasi merah matang','200g dada ayam rebus suwir','3 siung bawang putih','3 butir bawang merah','1 sdt kunyit','1 sdt ketumbar','1 sdm minyak','Garam'],
 ARRAY['Haluskan bawang, kunyit, ketumbar','Tumis bumbu hingga harum','Masukkan ayam suwir, aduk rata','Sajikan dengan nasi merah & lalapan'],
 ARRAY['diet','tinggi-protein','indonesia'],
 ARRAY['nasi merah','ayam suwir','menu diet indonesia'], false),
('telur-dadar-sayur','Telur Dadar Sayur Rendah Minyak','Telur dadar sayuran rendah minyak, cocok sarapan diet.','Sarapan','/images/recipes/telur-dadar.jpg',5,5,10,1,210,16,6,14,2,
 ARRAY['2 butir telur','30g bayam cincang','1 batang daun bawang','1 buah tomat kecil','1 sdt minyak zaitun','Garam & merica'],
 ARRAY['Kocok telur dengan garam & merica','Campurkan sayur cincang','Panaskan teflon dengan sedikit minyak','Tuang telur, masak hingga matang kedua sisi'],
 ARRAY['sarapan','vegetarian','tinggi-protein'],
 ARRAY['telur dadar sayur','sarapan diet','resep telur sehat'], true);
