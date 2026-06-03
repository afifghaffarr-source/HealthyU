
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  gender TEXT CHECK (gender IN ('male','female')),
  birth_date DATE,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  target_weight_kg NUMERIC,
  activity_level TEXT CHECK (activity_level IN ('sedentary','light','moderate','active','very_active')),
  dietary_preference TEXT,
  allergies TEXT[],
  health_conditions TEXT[],
  daily_calorie_target INT,
  language TEXT DEFAULT 'id',
  city TEXT DEFAULT 'Jakarta',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Food database
CREATE TABLE public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  category TEXT,
  calories NUMERIC NOT NULL,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  fiber_g NUMERIC DEFAULT 0,
  serving_size NUMERIC DEFAULT 100,
  serving_unit TEXT DEFAULT 'g',
  is_indonesian BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.food_items TO authenticated, anon;
GRANT ALL ON public.food_items TO service_role;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food public read" ON public.food_items FOR SELECT TO authenticated, anon USING (true);

-- Seed Indonesian foods
INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit) VALUES
('Nasi Putih','White Rice','staple',180,3,40,0.3,0.6,100,'g'),
('Nasi Goreng','Fried Rice','main',250,6,38,8,1.2,100,'g'),
('Ayam Bakar','Grilled Chicken','main',220,28,2,11,0,100,'g'),
('Ayam Goreng','Fried Chicken','main',290,25,5,18,0.4,100,'g'),
('Rendang Sapi','Beef Rendang','main',310,22,4,22,1.1,100,'g'),
('Soto Ayam','Chicken Soto','soup',120,9,8,5,1,250,'ml'),
('Gado-Gado','Gado-Gado','salad',180,7,18,9,4,250,'g'),
('Tempe Goreng','Fried Tempeh','side',190,18,9,11,5,100,'g'),
('Tahu Goreng','Fried Tofu','side',150,12,5,9,1.5,100,'g'),
('Bakso','Meatball Soup','soup',180,12,15,8,1,300,'ml'),
('Mie Ayam','Chicken Noodles','main',380,15,55,11,2,300,'g'),
('Sate Ayam','Chicken Satay','main',225,22,8,12,0.5,100,'g'),
('Bubur Ayam','Chicken Porridge','breakfast',180,9,28,4,1,250,'g'),
('Pisang','Banana','fruit',89,1.1,23,0.3,2.6,100,'g'),
('Apel','Apple','fruit',52,0.3,14,0.2,2.4,100,'g'),
('Telur Rebus','Boiled Egg','protein',155,13,1.1,11,0,100,'g'),
('Sayur Bayam','Spinach','vegetable',23,2.9,3.6,0.4,2.2,100,'g'),
('Brokoli','Broccoli','vegetable',34,2.8,7,0.4,2.6,100,'g'),
('Ikan Bakar','Grilled Fish','main',180,26,0,8,0,100,'g'),
('Kopi Hitam','Black Coffee','drink',2,0.3,0,0,0,200,'ml');

-- Meal logs
CREATE TABLE public.meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_item_id UUID REFERENCES public.food_items(id),
  custom_name TEXT,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  serving_qty NUMERIC NOT NULL DEFAULT 1,
  calories NUMERIC NOT NULL,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX meal_logs_user_date_idx ON public.meal_logs(user_id, logged_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_logs TO authenticated;
GRANT ALL ON public.meal_logs TO service_role;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meals all" ON public.meal_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Fasting sessions
CREATE TABLE public.fasting_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL DEFAULT '16:8',
  target_hours NUMERIC NOT NULL DEFAULT 16,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX fasting_user_idx ON public.fasting_sessions(user_id, start_time DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fasting_sessions TO authenticated;
GRANT ALL ON public.fasting_sessions TO service_role;
ALTER TABLE public.fasting_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fasting all" ON public.fasting_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Water logs
CREATE TABLE public.water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml INT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX water_user_idx ON public.water_logs(user_id, logged_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT ALL ON public.water_logs TO service_role;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own water all" ON public.water_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_user_idx ON public.chat_messages(user_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chat all" ON public.chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
