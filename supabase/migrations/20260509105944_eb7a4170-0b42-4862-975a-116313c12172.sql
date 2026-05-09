
-- Categories table
CREATE TABLE public.download_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.download_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on download_categories"
  ON public.download_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read active download_categories"
  ON public.download_categories FOR SELECT
  USING (is_active = true);

CREATE TRIGGER update_download_categories_updated_at
  BEFORE UPDATE ON public.download_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.download_categories (key, label, sort_order) VALUES
  ('sicherheitsdatenblatt', 'Sicherheitsdatenblatt', 10),
  ('bedienungsanleitung', 'Bedienungsanleitung', 20),
  ('groessentabelle', 'Größentabelle', 30),
  ('konformitaetserklaerung', 'Konformitätserklärung', 40),
  ('pflegehinweise', 'Pflegehinweise', 50);

-- Downloads table
CREATE TABLE public.product_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key text NOT NULL REFERENCES public.download_categories(key) ON UPDATE CASCADE,
  sku text NOT NULL,
  original_filename text NOT NULL,
  display_filename text NOT NULL,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  file_size_bytes bigint,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_downloads_sku ON public.product_downloads (lower(sku));
CREATE INDEX idx_product_downloads_category ON public.product_downloads (category_key);

ALTER TABLE public.product_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access on product_downloads"
  ON public.product_downloads FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read product_downloads"
  ON public.product_downloads FOR SELECT
  USING (true);

CREATE TRIGGER update_product_downloads_updated_at
  BEFORE UPDATE ON public.product_downloads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-downloads', 'product-downloads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read product-downloads files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-downloads');

CREATE POLICY "Admins manage product-downloads files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'product-downloads' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'product-downloads' AND has_role(auth.uid(), 'admin'::app_role));
