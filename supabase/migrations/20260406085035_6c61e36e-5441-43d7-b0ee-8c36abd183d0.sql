
-- Customer Cards (Kundenkarte)
CREATE TABLE public.customer_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_customer_id text NOT NULL,
  card_number text UNIQUE,
  tier text NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silber', 'gold', 'platin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  valid_from date DEFAULT CURRENT_DATE,
  valid_until date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_customer_cards_shopify ON public.customer_cards(shopify_customer_id);

ALTER TABLE public.customer_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read own customer_card"
  ON public.customer_cards FOR SELECT
  USING (true);

CREATE POLICY "Admins full access on customer_cards"
  ON public.customer_cards FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Horse Profiles (Pferdeprofile)
CREATE TABLE public.horse_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_customer_id text NOT NULL,
  name text NOT NULL,
  breed text,
  color text,
  height_cm integer,
  birth_year integer,
  notes text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_horse_profiles_shopify ON public.horse_profiles(shopify_customer_id);

ALTER TABLE public.horse_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read own horse_profiles"
  ON public.horse_profiles FOR SELECT
  USING (true);

CREATE POLICY "Public insert horse_profiles"
  ON public.horse_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public update horse_profiles"
  ON public.horse_profiles FOR UPDATE
  USING (true);

CREATE POLICY "Public delete horse_profiles"
  ON public.horse_profiles FOR DELETE
  USING (true);

CREATE POLICY "Admins full access on horse_profiles"
  ON public.horse_profiles FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_customer_cards_updated_at
  BEFORE UPDATE ON public.customer_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_horse_profiles_updated_at
  BEFORE UPDATE ON public.horse_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
