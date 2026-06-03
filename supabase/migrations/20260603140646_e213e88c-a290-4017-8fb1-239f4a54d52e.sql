
CREATE OR REPLACE FUNCTION public.compute_profile_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  h_m numeric;
  age_yrs numeric;
  activity_mult numeric;
BEGIN
  -- BMI
  IF NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 AND NEW.weight_kg IS NOT NULL THEN
    h_m := NEW.height_cm / 100.0;
    NEW.bmi := ROUND((NEW.weight_kg / (h_m * h_m))::numeric, 2);
    NEW.bmi_category := CASE
      WHEN NEW.bmi < 18.5 THEN 'underweight'
      WHEN NEW.bmi < 25 THEN 'normal'
      WHEN NEW.bmi < 30 THEN 'overweight'
      ELSE 'obese'
    END;
    -- Ideal weight range (BMI 18.5 - 24.9)
    NEW.ideal_weight_min := ROUND((18.5 * h_m * h_m)::numeric, 1);
    NEW.ideal_weight_max := ROUND((24.9 * h_m * h_m)::numeric, 1);
  END IF;

  -- BMR (Mifflin-St Jeor)
  IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL
     AND NEW.birth_date IS NOT NULL AND NEW.gender IS NOT NULL THEN
    age_yrs := EXTRACT(YEAR FROM AGE(NEW.birth_date));
    IF lower(NEW.gender) IN ('male','m','laki-laki','pria') THEN
      NEW.bmr := ROUND((10 * NEW.weight_kg + 6.25 * NEW.height_cm - 5 * age_yrs + 5)::numeric, 0);
    ELSE
      NEW.bmr := ROUND((10 * NEW.weight_kg + 6.25 * NEW.height_cm - 5 * age_yrs - 161)::numeric, 0);
    END IF;

    -- TDEE
    activity_mult := CASE lower(COALESCE(NEW.activity_level, 'sedentary'))
      WHEN 'sedentary' THEN 1.2
      WHEN 'light' THEN 1.375
      WHEN 'lightly_active' THEN 1.375
      WHEN 'moderate' THEN 1.55
      WHEN 'moderately_active' THEN 1.55
      WHEN 'active' THEN 1.725
      WHEN 'very_active' THEN 1.725
      WHEN 'extra_active' THEN 1.9
      WHEN 'athlete' THEN 1.9
      ELSE 1.2
    END;
    NEW.tdee := ROUND((NEW.bmr * activity_mult)::numeric, 0);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_compute_metrics ON public.profiles;
CREATE TRIGGER profiles_compute_metrics
BEFORE INSERT OR UPDATE OF weight_kg, height_cm, activity_level, birth_date, gender
ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.compute_profile_metrics();

-- Backfill existing rows
UPDATE public.profiles SET updated_at = updated_at WHERE weight_kg IS NOT NULL OR height_cm IS NOT NULL;
