
-- Comments on community posts
CREATE TABLE public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments public read" ON public.community_comments FOR SELECT USING (true);
CREATE POLICY "own comment insert" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own comment delete" ON public.community_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Progress photos (private to owner)
CREATE TABLE public.progress_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  weight_kg NUMERIC,
  notes TEXT,
  taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.progress_photos TO authenticated;
GRANT ALL ON public.progress_photos TO service_role;
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress all" ON public.progress_photos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Healthy recipes (public)
CREATE TABLE public.recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'main',
  calories INTEGER NOT NULL DEFAULT 0,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  prep_min INTEGER NOT NULL DEFAULT 15,
  servings INTEGER NOT NULL DEFAULT 1,
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  instructions TEXT[] NOT NULL DEFAULT '{}',
  is_indonesian BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT ON public.recipes TO anon;
GRANT SELECT ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recipes public read" ON public.recipes FOR SELECT USING (true);

-- Seed a few Indonesian healthy recipes
INSERT INTO public.recipes (title, description, category, calories, protein_g, carbs_g, fat_g, prep_min, servings, ingredients, instructions) VALUES
('Nasi Merah Ayam Bakar', 'Menu sehat tinggi protein dengan nasi merah dan ayam bakar bumbu kecap.', 'main', 520, 38, 55, 14, 30, 1,
  ARRAY['150g nasi merah','150g dada ayam','2 sdm kecap manis','1 siung bawang putih','1 sdm minyak zaitun','Garam & lada secukupnya'],
  ARRAY['Lumuri ayam dengan bumbu, diamkan 15 menit','Bakar ayam hingga matang merata','Sajikan dengan nasi merah hangat']),
('Gado-Gado Light', 'Salad sayur khas Indonesia dengan saus kacang rendah kalori.', 'main', 380, 18, 32, 18, 20, 1,
  ARRAY['100g tauge','100g bayam rebus','1 butir telur rebus','50g tahu','2 sdm selai kacang','Air jeruk nipis'],
  ARRAY['Rebus sayuran hingga matang','Campur selai kacang dengan air jeruk nipis','Sajikan sayur dengan saus kacang']),
('Smoothie Pisang Oat', 'Sarapan cepat tinggi serat dan energi.', 'breakfast', 290, 10, 48, 6, 5, 1,
  ARRAY['1 pisang','40g oat','200ml susu rendah lemak','1 sdt madu'],
  ARRAY['Blender semua bahan hingga halus','Sajikan dingin']),
('Sup Ayam Jagung', 'Sup ringan dan menghangatkan untuk makan malam.', 'dinner', 260, 22, 28, 6, 25, 1,
  ARRAY['100g dada ayam','100g jagung manis','1 wortel','1 batang seledri','Garam, lada, bawang putih'],
  ARRAY['Tumis bawang putih','Masukkan ayam, air, dan sayuran','Masak hingga matang, bumbui']),
('Salad Buah Yogurt', 'Snack manis sehat penuh vitamin.', 'snack', 180, 5, 32, 3, 10, 1,
  ARRAY['100g apel','100g pir','100g anggur','3 sdm yogurt plain','1 sdt madu'],
  ARRAY['Potong buah dadu','Aduk dengan yogurt dan madu','Sajikan dingin']),
('Tumis Tempe Brokoli', 'Lauk vegetarian tinggi protein dan serat.', 'main', 320, 22, 18, 16, 15, 1,
  ARRAY['100g tempe','150g brokoli','1 siung bawang putih','1 sdm kecap asin','1 sdm minyak'],
  ARRAY['Tumis bawang putih hingga harum','Masukkan tempe, lalu brokoli','Bumbui kecap asin, masak sebentar']);
