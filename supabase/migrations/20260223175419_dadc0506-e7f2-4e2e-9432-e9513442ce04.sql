
-- Enum for field types
CREATE TYPE public.configurator_field_type AS ENUM (
  'text_input', 'dropdown_single', 'dropdown_multi',
  'image_single', 'image_multi', 'checkbox', 'radio'
);

-- Configurator products
CREATE TABLE public.configurator_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shopify_product_id TEXT NOT NULL UNIQUE,
  shopify_handle TEXT NOT NULL,
  title TEXT NOT NULL,
  featured_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configurator groups
CREATE TABLE public.configurator_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  field_type public.configurator_field_type NOT NULL DEFAULT 'dropdown_single',
  is_required BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Configurator group values
CREATE TABLE public.configurator_group_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.configurator_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price_delta DECIMAL NOT NULL DEFAULT 0,
  sku_hint TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Product-group assignments
CREATE TABLE public.configurator_product_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  configurator_product_id UUID NOT NULL REFERENCES public.configurator_products(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.configurator_groups(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  is_required_override BOOLEAN,
  UNIQUE(configurator_product_id, group_id)
);

-- RLS policies
ALTER TABLE public.configurator_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurator_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurator_group_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurator_product_groups ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins full access on configurator_products" ON public.configurator_products FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on configurator_groups" ON public.configurator_groups FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on configurator_group_values" ON public.configurator_group_values FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins full access on configurator_product_groups" ON public.configurator_product_groups FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Public read for storefront
CREATE POLICY "Public read configurator_products" ON public.configurator_products FOR SELECT USING (status = 'active');
CREATE POLICY "Public read configurator_groups" ON public.configurator_groups FOR SELECT USING (true);
CREATE POLICY "Public read configurator_group_values" ON public.configurator_group_values FOR SELECT USING (is_active = true);
CREATE POLICY "Public read configurator_product_groups" ON public.configurator_product_groups FOR SELECT USING (true);
