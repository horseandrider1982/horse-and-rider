CREATE TABLE public.collection_seo_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL,
  locale text NOT NULL DEFAULT 'de',
  heading text,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handle, locale)
);

ALTER TABLE public.collection_seo_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read collection SEO texts"
  ON public.collection_seo_texts FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage collection SEO texts"
  ON public.collection_seo_texts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));