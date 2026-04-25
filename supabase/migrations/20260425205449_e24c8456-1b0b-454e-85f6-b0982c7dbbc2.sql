CREATE TABLE public.collection_facets_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL,
  locale text NOT NULL DEFAULT 'de',
  vendors jsonb NOT NULL DEFAULT '[]'::jsonb,
  properties jsonb NOT NULL DEFAULT '[]'::jsonb,
  product_count integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handle, locale)
);

CREATE INDEX idx_collection_facets_cache_handle_locale
  ON public.collection_facets_cache (handle, locale);

ALTER TABLE public.collection_facets_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read collection_facets_cache"
  ON public.collection_facets_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Admins full access on collection_facets_cache"
  ON public.collection_facets_cache
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_collection_facets_cache_updated_at
  BEFORE UPDATE ON public.collection_facets_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();