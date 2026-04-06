ALTER TABLE public.horse_profiles
  ADD COLUMN IF NOT EXISTS discipline text,
  ADD COLUMN IF NOT EXISTS training_level integer,
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_horse_profiles_external_id ON public.horse_profiles (external_id) WHERE external_id IS NOT NULL;