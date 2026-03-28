CREATE TABLE public.shopify_menu_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL,
  locale text NOT NULL DEFAULT 'de',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handle, locale)
);

ALTER TABLE public.shopify_menu_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read shopify_menu_cache"
  ON public.shopify_menu_cache FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins full access on shopify_menu_cache"
  ON public.shopify_menu_cache FOR ALL
  TO public USING (has_role(auth.uid(), 'admin'::app_role));