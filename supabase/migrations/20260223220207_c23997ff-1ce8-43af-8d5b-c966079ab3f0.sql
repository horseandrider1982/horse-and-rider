
-- public_routes: Registry of all public-facing pages
CREATE TABLE public.public_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type redirect_entity_type NOT NULL,
  entity_id text NOT NULL,
  title text NOT NULL,
  sku text,
  current_path text NOT NULL,
  canonical_key text NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(canonical_key)
);

CREATE INDEX idx_public_routes_entity ON public.public_routes(entity_type, entity_id);
CREATE INDEX idx_public_routes_sku ON public.public_routes(sku);
CREATE UNIQUE INDEX idx_public_routes_current_path ON public.public_routes(current_path);
CREATE INDEX idx_public_routes_canonical ON public.public_routes(canonical_key);

ALTER TABLE public.public_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on public_routes"
  ON public.public_routes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read public_routes"
  ON public.public_routes FOR SELECT
  USING (is_public = true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_public_routes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_public_routes_updated_at
  BEFORE UPDATE ON public.public_routes
  FOR EACH ROW
  EXECUTE FUNCTION update_public_routes_updated_at();

-- Seed static pages into public_routes
INSERT INTO public.public_routes (entity_type, entity_id, title, current_path, canonical_key) VALUES
  ('page', 'home', 'Startseite', '/', 'page:home'),
  ('page', 'unsere-marken', 'Unsere Marken', '/unsere-marken', 'page:unsere-marken'),
  ('page', 'news', 'News', '/news', 'page:news'),
  ('page', 'impressum', 'Impressum', '/impressum', 'page:impressum'),
  ('page', 'datenschutz', 'Datenschutz', '/datenschutz', 'page:datenschutz'),
  ('page', 'agb', 'AGB', '/agb', 'page:agb'),
  ('page', 'widerrufsrecht', 'Widerrufsrecht', '/widerrufsrecht', 'page:widerrufsrecht'),
  ('page', 'kontakt', 'Kontakt', '/kontakt', 'page:kontakt'),
  ('page', 'auth', 'Anmelden', '/auth', 'page:auth'),
  ('page', 'account', 'Mein Konto', '/account', 'page:account'),
  ('page', 'search', 'Suche', '/search', 'page:search')
ON CONFLICT (canonical_key) DO NOTHING;

-- Also seed existing brands into public_routes
INSERT INTO public.public_routes (entity_type, entity_id, title, current_path, canonical_key, sku)
SELECT 'brand', id::text, name, '/unsere-marken/' || slug, 'brand:' || id::text, NULL
FROM public.brands
WHERE is_active = true
ON CONFLICT (canonical_key) DO NOTHING;

-- Also seed existing news articles into public_routes
INSERT INTO public.public_routes (entity_type, entity_id, title, current_path, canonical_key, sku)
SELECT 'news', id::text, title, '/news/' || slug, 'news:' || id::text, NULL
FROM public.news_articles
WHERE status = 'published'
ON CONFLICT (canonical_key) DO NOTHING;
