-- New: many-to-many assignment between downloads and product SKUs
CREATE TABLE IF NOT EXISTS public.product_download_skus (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  download_id uuid NOT NULL REFERENCES public.product_downloads(id) ON DELETE CASCADE,
  sku text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (download_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_product_download_skus_sku ON public.product_download_skus (sku);
CREATE INDEX IF NOT EXISTS idx_product_download_skus_download_id ON public.product_download_skus (download_id);

ALTER TABLE public.product_download_skus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product_download_skus"
  ON public.product_download_skus FOR SELECT USING (true);

CREATE POLICY "Admins full access on product_download_skus"
  ON public.product_download_skus FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing single-SKU rows into the new join table
INSERT INTO public.product_download_skus (download_id, sku)
SELECT id, lower(sku)
FROM public.product_downloads
WHERE sku IS NOT NULL AND sku <> ''
ON CONFLICT DO NOTHING;

-- Add a human title field; sku is no longer required
ALTER TABLE public.product_downloads ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.product_downloads ALTER COLUMN sku DROP NOT NULL;
