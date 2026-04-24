
-- Tabelle für Eigenschaften-Konfiguration
CREATE TABLE public.product_property_display_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_namespace text NOT NULL DEFAULT 'xentral_props',
  shopify_key text NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  icon_url text,
  icon_prompt text,
  icon_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shopify_namespace, shopify_key)
);

ALTER TABLE public.product_property_display_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active property config"
  ON public.product_property_display_config
  FOR SELECT
  USING (true);

CREATE POLICY "Admins manage property config"
  ON public.product_property_display_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_property_config_updated_at
  BEFORE UPDATE ON public.product_property_display_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_property_config_active_order
  ON public.product_property_display_config (is_active, display_order);

-- Storage-Bucket für Icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-icons', 'property-icons', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read property icons"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'property-icons');

CREATE POLICY "Admins upload property icons"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'property-icons' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update property icons"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'property-icons' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete property icons"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'property-icons' AND has_role(auth.uid(), 'admin'::app_role));
